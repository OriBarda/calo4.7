import { prisma } from "../lib/database";
import { OpenAIService } from "./openai";
import { MealAnalysisInput, MealUpdateInput } from "../types/nutrition";

export interface MealData {
  name: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export class NutritionService {
  static async analyzeMeal(user_id: string, data: MealAnalysisInput) {
    try {
      console.log("🔍 Starting meal analysis for user:", user_id);

      // Check user's AI request limits
      const user = await prisma.user.findUnique({
        where: { user_id },
        select: {
          aiRequestsCount: true,
          aiRequestsResetAt: true,
          subscription_type: true,
        },
      });

      if (user) {
        // Check if we need to reset daily limits
        const now = new Date();
        const resetTime = new Date(user.aiRequestsResetAt);
        const hoursSinceReset = (now.getTime() - resetTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceReset >= 24) {
          await prisma.user.update({
            where: { user_id },
            data: {
              aiRequestsCount: 0,
              aiRequestsResetAt: now,
            },
          });
          user.aiRequestsCount = 0;
        }

        // Check limits based on subscription
        const limits = {
          FREE: 10,
          BASIC: 50,
          PREMIUM: 200,
        };

        const userLimit = limits[user.subscription_type as keyof typeof limits] || limits.FREE;

        if (user.aiRequestsCount >= userLimit) {
          throw new Error(`Daily AI analysis limit reached (${userLimit}). Upgrade your subscription for more analyses.`);
        }

        // Increment AI request count
        await prisma.user.update({
          where: { user_id },
          data: {
            aiRequestsCount: user.aiRequestsCount + 1,
          },
        });
      }

      // Analyze with OpenAI
      const analysis = await OpenAIService.analyzeMealImage(
        data.imageBase64,
        data.language,
        data.updateText
      );

      console.log("✅ Meal analysis completed");
      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      console.error("💥 Meal analysis error:", error);
      throw error;
    }
  }

  static async updateMeal(user_id: string, data: MealUpdateInput) {
    try {
      console.log("🔄 Updating meal for user:", user_id);

      // Find the meal
      const meal = await prisma.meal.findFirst({
        where: {
          meal_id: parseInt(data.meal_id),
          user_id,
        },
      });

      if (!meal) {
        throw new Error("Meal not found");
      }

      // Get original analysis data
      const originalAnalysis = {
        name: meal.meal_name || "Unknown",
        description: meal.meal_name || "",
        calories: meal.calories || 0,
        protein: meal.protein_g || 0,
        carbs: meal.carbs_g || 0,
        fat: meal.fats_g || 0,
        fiber: meal.fiber_g,
        sugar: meal.sugar_g,
        sodium: meal.sodium_mg,
        confidence: 85,
        ingredients: [],
        servingSize: "1 serving",
        cookingMethod: "Unknown",
        healthNotes: "",
      };

      // Update analysis with OpenAI
      const updatedAnalysis = await OpenAIService.updateMealAnalysis(
        originalAnalysis,
        data.updateText,
        data.language
      );

      // Update meal in database
      const updatedMeal = await prisma.meal.update({
        where: { meal_id: parseInt(data.meal_id) },
        data: {
          meal_name: updatedAnalysis.name,
          calories: updatedAnalysis.calories,
          protein_g: updatedAnalysis.protein,
          carbs_g: updatedAnalysis.carbs,
          fats_g: updatedAnalysis.fat,
          fiber_g: updatedAnalysis.fiber,
          sugar_g: updatedAnalysis.sugar,
          sodium_mg: updatedAnalysis.sodium,
        },
      });

      // Transform to client format
      const transformedMeal = this.transformMealData(updatedMeal);

      console.log("✅ Meal updated successfully");
      return transformedMeal;
    } catch (error) {
      console.error("💥 Meal update error:", error);
      throw error;
    }
  }

  static async saveMeal(user_id: string, mealData: MealData, imageBase64?: string) {
    try {
      console.log("💾 Saving meal for user:", user_id);

      // Save meal to database
      const meal = await prisma.meal.create({
        data: {
          user_id,
          image_url: imageBase64 ? `data:image/jpeg;base64,${imageBase64.substring(0, 100)}...` : "",
          meal_name: mealData.name,
          calories: mealData.calories,
          protein_g: mealData.protein,
          carbs_g: mealData.carbs,
          fats_g: mealData.fat,
          fiber_g: mealData.fiber,
          sugar_g: mealData.sugar,
          sodium_mg: mealData.sodium,
          analysis_status: "COMPLETED",
        },
      });

      // Transform to client format
      const transformedMeal = this.transformMealData(meal);

      console.log("✅ Meal saved successfully");
      return transformedMeal;
    } catch (error) {
      console.error("💥 Save meal error:", error);
      throw error;
    }
  }

  static async getUserMeals(user_id: string) {
    try {
      console.log("📥 Getting meals for user:", user_id);

      const meals = await prisma.meal.findMany({
        where: { user_id },
        orderBy: { upload_time: "desc" },
        take: 100, // Limit to recent 100 meals
      });

      // Transform to client format
      const transformedMeals = meals.map(meal => this.transformMealData(meal));

      console.log("✅ Retrieved", transformedMeals.length, "meals");
      return transformedMeals;
    } catch (error) {
      console.error("💥 Get meals error:", error);
      throw error;
    }
  }

  static async getDailyStats(user_id: string, date: string) {
    try {
      console.log("📊 Getting daily stats for user:", user_id, "date:", date);

      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const meals = await prisma.meal.findMany({
        where: {
          user_id,
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },
      });

      // Calculate totals
      const stats = meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + (meal.calories || 0),
          protein: acc.protein + (meal.protein_g || 0),
          carbs: acc.carbs + (meal.carbs_g || 0),
          fat: acc.fat + (meal.fats_g || 0),
          fiber: acc.fiber + (meal.fiber_g || 0),
          sugar: acc.sugar + (meal.sugar_g || 0),
          mealCount: acc.mealCount + 1,
        }),
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          mealCount: 0,
        }
      );

      console.log("✅ Daily stats calculated");
      return stats;
    } catch (error) {
      console.error("💥 Get daily stats error:", error);
      throw error;
    }
  }

  // NEW METHODS FOR HISTORY FEATURES

  static async saveMealFeedback(user_id: string, mealId: string, feedback: any) {
    try {
      console.log("💬 Saving meal feedback for meal:", mealId);

      // For now, we'll store feedback in the meal's additives_json field
      // In a production app, you might want a separate feedback table
      const meal = await prisma.meal.findFirst({
        where: {
          meal_id: parseInt(mealId),
          user_id,
        },
      });

      if (!meal) {
        throw new Error("Meal not found");
      }

      // Update meal with feedback
      await prisma.meal.update({
        where: { meal_id: parseInt(mealId) },
        data: {
          additives_json: {
            ...((meal.additives_json as any) || {}),
            feedback,
            feedbackDate: new Date().toISOString(),
          },
        },
      });

      console.log("✅ Meal feedback saved");
      return { success: true, feedback };
    } catch (error) {
      console.error("💥 Save feedback error:", error);
      throw error;
    }
  }

  static async toggleMealFavorite(user_id: string, mealId: string) {
    try {
      console.log("❤️ Toggling favorite for meal:", mealId);

      const meal = await prisma.meal.findFirst({
        where: {
          meal_id: parseInt(mealId),
          user_id,
        },
      });

      if (!meal) {
        throw new Error("Meal not found");
      }

      const currentFavorite = (meal.additives_json as any)?.isFavorite || false;
      const newFavorite = !currentFavorite;

      await prisma.meal.update({
        where: { meal_id: parseInt(mealId) },
        data: {
          additives_json: {
            ...((meal.additives_json as any) || {}),
            isFavorite: newFavorite,
          },
        },
      });

      console.log("✅ Favorite status toggled");
      return { success: true, isFavorite: newFavorite };
    } catch (error) {
      console.error("💥 Toggle favorite error:", error);
      throw error;
    }
  }

  static async duplicateMeal(user_id: string, mealId: string, newDate?: string) {
    try {
      console.log("📋 Duplicating meal:", mealId);

      const originalMeal = await prisma.meal.findFirst({
        where: {
          meal_id: parseInt(mealId),
          user_id,
        },
      });

      if (!originalMeal) {
        throw new Error("Meal not found");
      }

      // Create duplicate meal
      const duplicatedMeal = await prisma.meal.create({
        data: {
          user_id,
          image_url: originalMeal.image_url,
          meal_name: originalMeal.meal_name,
          calories: originalMeal.calories,
          protein_g: originalMeal.protein_g,
          carbs_g: originalMeal.carbs_g,
          fats_g: originalMeal.fats_g,
          fiber_g: originalMeal.fiber_g,
          sugar_g: originalMeal.sugar_g,
          sodium_mg: originalMeal.sodium_mg,
          analysis_status: "COMPLETED",
          upload_time: newDate ? new Date(newDate) : new Date(),
        },
      });

      // Transform to client format
      const transformedMeal = this.transformMealData(duplicatedMeal);

      console.log("✅ Meal duplicated successfully");
      return transformedMeal;
    } catch (error) {
      console.error("💥 Duplicate meal error:", error);
      throw error;
    }
  }

  // Helper method to transform database meal to client format
  private static transformMealData(meal: any) {
    return {
      // Server fields
      meal_id: meal.meal_id,
      user_id: meal.user_id,
      image_url: meal.image_url,
      upload_time: meal.upload_time,
      analysis_status: meal.analysis_status,
      meal_name: meal.meal_name,
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fats_g: meal.fats_g,
      fiber_g: meal.fiber_g,
      sugar_g: meal.sugar_g,
      sodium_mg: meal.sodium_mg,
      createdAt: meal.createdAt,

      // Client compatibility fields
      id: meal.meal_id.toString(),
      name: meal.meal_name || "Unknown Meal",
      description: meal.meal_name,
      imageUrl: meal.image_url,
      protein: meal.protein_g || 0,
      carbs: meal.carbs_g || 0,
      fat: meal.fats_g || 0,
      fiber: meal.fiber_g || 0,
      sugar: meal.sugar_g || 0,
      sodium: meal.sodium_mg || 0,
      userId: meal.user_id,

      // History features
      isFavorite: (meal.additives_json as any)?.isFavorite || false,
      tasteRating: (meal.additives_json as any)?.feedback?.tasteRating || 0,
      satietyRating: (meal.additives_json as any)?.feedback?.satietyRating || 0,
      energyRating: (meal.additives_json as any)?.feedback?.energyRating || 0,
      heavinessRating: (meal.additives_json as any)?.feedback?.heavinessRating || 0,
    };
  }
}