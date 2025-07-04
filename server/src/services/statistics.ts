import { prisma } from "../lib/database";

export interface NutritionStatistics {
  averageCaloriesDaily: number;
  calorieGoalAchievementPercent: number;
  averageProteinDaily: number;
  averageCarbsDaily: number;
  averageFatsDaily: number;
  averageFiberDaily: number;
  averageSodiumDaily: number;
  averageSugarDaily: number;
  averageFluidsDaily: number;
  processedFoodPercentage: number;
  alcoholCaffeineIntake: number;
  vegetableFruitIntake: number;
  fullLoggingPercentage: number;
  allergenAlerts: string[];
  healthRiskPercentage: number;
  averageEatingHours: { start: string; end: string };
  intermittentFastingHours: number;
  missedMealsAlert: number;
  nutritionScore: number;
  weeklyTrends: {
    calories: number[];
    protein: number[];
    carbs: number[];
    fats: number[];
  };
  insights: string[];
  recommendations: string[];
}

export interface GlobalStatistics {
  generalStats: {
    averageCaloriesPerMeal: number;
    averageProteinPerMeal: number;
    mostCommonMealTime: string;
    averageMealsPerDay: number;
  };
  healthInsights: {
    proteinAdequacy: string;
    calorieDistribution: string;
    fiberIntake: string;
  };
  recommendations: {
    nutritionalTips: string[];
  };
}

export class StatisticsService {
  static async getNutritionStatistics(
    user_id: string,
    period: "week" | "month" | "custom" = "week"
  ): Promise<NutritionStatistics> {
    try {
      console.log("📊 Generating nutrition statistics for user:", user_id, "period:", period);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case "week":
          startDate.setDate(endDate.getDate() - 7);
          break;
        case "month":
          startDate.setDate(endDate.getDate() - 30);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }

      // Get meals for the period
      const meals = await prisma.meal.findMany({
        where: {
          user_id,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: "asc" },
      });

      console.log("📈 Found", meals.length, "meals for analysis");

      if (meals.length === 0) {
        return this.getDefaultStatistics();
      }

      // Calculate basic averages
      const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      const totals = meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + (meal.calories || 0),
          protein: acc.protein + (meal.protein_g || 0),
          carbs: acc.carbs + (meal.carbs_g || 0),
          fats: acc.fats + (meal.fats_g || 0),
          fiber: acc.fiber + (meal.fiber_g || 0),
          sugar: acc.sugar + (meal.sugar_g || 0),
          sodium: acc.sodium + (meal.sodium_mg || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, sugar: 0, sodium: 0 }
      );

      // Calculate daily averages
      const averageCaloriesDaily = totals.calories / totalDays;
      const averageProteinDaily = totals.protein / totalDays;
      const averageCarbsDaily = totals.carbs / totalDays;
      const averageFatsDaily = totals.fats / totalDays;
      const averageFiberDaily = totals.fiber / totalDays;
      const averageSugarDaily = totals.sugar / totalDays;
      const averageSodiumDaily = totals.sodium / totalDays;

      // Calculate goal achievement (assuming 2000 cal goal)
      const calorieGoal = 2000;
      const calorieGoalAchievementPercent = Math.min(100, (averageCaloriesDaily / calorieGoal) * 100);

      // Calculate weekly trends
      const weeklyTrends = this.calculateWeeklyTrends(meals);

      // Calculate nutrition score
      const nutritionScore = this.calculateNutritionScore({
        averageCaloriesDaily,
        averageProteinDaily,
        averageFiberDaily,
        averageSodiumDaily,
      });

      // Generate insights and recommendations
      const insights = this.generateInsights({
        averageCaloriesDaily,
        averageProteinDaily,
        averageFiberDaily,
        mealCount: meals.length,
        totalDays,
      });

      const recommendations = this.generateRecommendations({
        averageCaloriesDaily,
        averageProteinDaily,
        averageFiberDaily,
        nutritionScore,
      });

      // Calculate eating patterns
      const eatingHours = this.calculateEatingHours(meals);
      const intermittentFastingHours = this.calculateIntermittentFasting(meals);

      const statistics: NutritionStatistics = {
        averageCaloriesDaily: Math.round(averageCaloriesDaily),
        calorieGoalAchievementPercent: Math.round(calorieGoalAchievementPercent),
        averageProteinDaily: Math.round(averageProteinDaily),
        averageCarbsDaily: Math.round(averageCarbsDaily),
        averageFatsDaily: Math.round(averageFatsDaily),
        averageFiberDaily: Math.round(averageFiberDaily),
        averageSodiumDaily: Math.round(averageSodiumDaily),
        averageSugarDaily: Math.round(averageSugarDaily),
        averageFluidsDaily: 2000, // Default estimate
        processedFoodPercentage: 25, // Estimate
        alcoholCaffeineIntake: 0, // Not tracked yet
        vegetableFruitIntake: 60, // Estimate
        fullLoggingPercentage: Math.min(100, (meals.length / (totalDays * 3)) * 100),
        allergenAlerts: [],
        healthRiskPercentage: nutritionScore < 60 ? 25 : 5,
        averageEatingHours: eatingHours,
        intermittentFastingHours,
        missedMealsAlert: Math.max(0, (totalDays * 3) - meals.length),
        nutritionScore,
        weeklyTrends,
        insights,
        recommendations,
      };

      console.log("✅ Statistics generated successfully");
      return statistics;
    } catch (error) {
      console.error("💥 Error generating statistics:", error);
      throw new Error("Failed to generate nutrition statistics");
    }
  }

  static async generatePDFReport(user_id: string): Promise<Buffer> {
    try {
      console.log("📄 Generating PDF report for user:", user_id);
      
      // For now, return a simple text buffer
      // In a real implementation, you'd use a PDF library like puppeteer or jsPDF
      const reportText = `
        Nutrition Report for User: ${user_id}
        Generated: ${new Date().toISOString()}
        
        This is a placeholder PDF report.
        In a production app, this would contain detailed nutrition analysis,
        charts, and recommendations.
      `;
      
      return Buffer.from(reportText, 'utf-8');
    } catch (error) {
      console.error("💥 Error generating PDF report:", error);
      throw new Error("Failed to generate PDF report");
    }
  }

  static async generateInsights(user_id: string): Promise<string[]> {
    try {
      console.log("💡 Generating insights for user:", user_id);
      
      const statistics = await this.getNutritionStatistics(user_id, "week");
      
      return this.generateRecommendations({
        averageCaloriesDaily: statistics.averageCaloriesDaily,
        averageProteinDaily: statistics.averageProteinDaily,
        averageFiberDaily: statistics.averageFiberDaily,
        nutritionScore: statistics.nutritionScore,
      });
    } catch (error) {
      console.error("💥 Error generating insights:", error);
      throw new Error("Failed to generate insights");
    }
  }

  // Helper methods

  private static getDefaultStatistics(): NutritionStatistics {
    return {
      averageCaloriesDaily: 0,
      calorieGoalAchievementPercent: 0,
      averageProteinDaily: 0,
      averageCarbsDaily: 0,
      averageFatsDaily: 0,
      averageFiberDaily: 0,
      averageSodiumDaily: 0,
      averageSugarDaily: 0,
      averageFluidsDaily: 0,
      processedFoodPercentage: 0,
      alcoholCaffeineIntake: 0,
      vegetableFruitIntake: 0,
      fullLoggingPercentage: 0,
      allergenAlerts: [],
      healthRiskPercentage: 0,
      averageEatingHours: { start: "08:00", end: "20:00" },
      intermittentFastingHours: 12,
      missedMealsAlert: 0,
      nutritionScore: 50,
      weeklyTrends: {
        calories: [0, 0, 0, 0, 0, 0, 0],
        protein: [0, 0, 0, 0, 0, 0, 0],
        carbs: [0, 0, 0, 0, 0, 0, 0],
        fats: [0, 0, 0, 0, 0, 0, 0],
      },
      insights: ["Start logging meals to see personalized insights"],
      recommendations: ["Begin by logging your meals regularly"],
    };
  }

  private static calculateWeeklyTrends(meals: any[]) {
    const trends = {
      calories: [0, 0, 0, 0, 0, 0, 0],
      protein: [0, 0, 0, 0, 0, 0, 0],
      carbs: [0, 0, 0, 0, 0, 0, 0],
      fats: [0, 0, 0, 0, 0, 0, 0],
    };

    // Group meals by day of week
    const mealsByDay: { [key: number]: any[] } = {};
    
    meals.forEach(meal => {
      const dayOfWeek = new Date(meal.createdAt).getDay();
      if (!mealsByDay[dayOfWeek]) mealsByDay[dayOfWeek] = [];
      mealsByDay[dayOfWeek].push(meal);
    });

    // Calculate daily totals
    Object.keys(mealsByDay).forEach(day => {
      const dayIndex = parseInt(day);
      const dayMeals = mealsByDay[dayIndex];
      
      trends.calories[dayIndex] = dayMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
      trends.protein[dayIndex] = dayMeals.reduce((sum, meal) => sum + (meal.protein_g || 0), 0);
      trends.carbs[dayIndex] = dayMeals.reduce((sum, meal) => sum + (meal.carbs_g || 0), 0);
      trends.fats[dayIndex] = dayMeals.reduce((sum, meal) => sum + (meal.fats_g || 0), 0);
    });

    return trends;
  }

  private static calculateNutritionScore(data: {
    averageCaloriesDaily: number;
    averageProteinDaily: number;
    averageFiberDaily: number;
    averageSodiumDaily: number;
  }): number {
    let score = 100;

    // Calorie assessment (target: 1800-2200)
    if (data.averageCaloriesDaily < 1200 || data.averageCaloriesDaily > 2800) {
      score -= 20;
    } else if (data.averageCaloriesDaily < 1600 || data.averageCaloriesDaily > 2400) {
      score -= 10;
    }

    // Protein assessment (target: 1.2-2.0g per kg body weight, assume 70kg)
    const proteinTarget = 70 * 1.6; // 112g
    if (data.averageProteinDaily < proteinTarget * 0.7) {
      score -= 15;
    } else if (data.averageProteinDaily < proteinTarget * 0.9) {
      score -= 5;
    }

    // Fiber assessment (target: 25-35g)
    if (data.averageFiberDaily < 15) {
      score -= 15;
    } else if (data.averageFiberDaily < 20) {
      score -= 5;
    }

    // Sodium assessment (target: <2300mg)
    if (data.averageSodiumDaily > 3000) {
      score -= 10;
    } else if (data.averageSodiumDaily > 2500) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private static generateInsights(data: {
    averageCaloriesDaily: number;
    averageProteinDaily: number;
    averageFiberDaily: number;
    mealCount: number;
    totalDays: number;
  }): string[] {
    const insights: string[] = [];

    // Calorie insights
    if (data.averageCaloriesDaily < 1500) {
      insights.push("Your calorie intake appears low. Consider adding healthy, nutrient-dense foods.");
    } else if (data.averageCaloriesDaily > 2500) {
      insights.push("Your calorie intake is quite high. Focus on portion control and nutrient density.");
    } else {
      insights.push("Your calorie intake is within a reasonable range.");
    }

    // Protein insights
    if (data.averageProteinDaily < 80) {
      insights.push("Consider increasing protein intake with lean meats, fish, eggs, or plant-based options.");
    } else if (data.averageProteinDaily > 150) {
      insights.push("Your protein intake is quite high. Ensure you're balancing with other nutrients.");
    } else {
      insights.push("Your protein intake looks good for maintaining muscle mass.");
    }

    // Meal frequency insights
    const mealsPerDay = data.mealCount / data.totalDays;
    if (mealsPerDay < 2) {
      insights.push("Try to eat more regularly throughout the day for better energy levels.");
    } else if (mealsPerDay > 5) {
      insights.push("You're eating frequently, which can be good for metabolism if portions are controlled.");
    }

    // Fiber insights
    if (data.averageFiberDaily < 20) {
      insights.push("Increase fiber intake with more vegetables, fruits, and whole grains.");
    }

    return insights;
  }

  private static generateRecommendations(data: {
    averageCaloriesDaily: number;
    averageProteinDaily: number;
    averageFiberDaily: number;
    nutritionScore: number;
  }): string[] {
    const recommendations: string[] = [];

    if (data.nutritionScore < 60) {
      recommendations.push("Focus on eating more whole, unprocessed foods");
      recommendations.push("Try to include vegetables in every meal");
      recommendations.push("Consider consulting with a nutritionist");
    } else if (data.nutritionScore < 80) {
      recommendations.push("You're doing well! Try to increase vegetable variety");
      recommendations.push("Consider adding more fiber-rich foods");
      recommendations.push("Stay consistent with your healthy eating patterns");
    } else {
      recommendations.push("Excellent nutrition habits! Keep up the great work");
      recommendations.push("Consider sharing your success strategies with others");
      recommendations.push("Focus on maintaining these healthy patterns long-term");
    }

    // Specific nutrient recommendations
    if (data.averageProteinDaily < 100) {
      recommendations.push("Add a protein source to each meal and snack");
    }

    if (data.averageFiberDaily < 25) {
      recommendations.push("Include more beans, lentils, and whole grains in your diet");
    }

    return recommendations;
  }

  private static calculateEatingHours(meals: any[]): { start: string; end: string } {
    if (meals.length === 0) {
      return { start: "08:00", end: "20:00" };
    }

    const hours = meals.map(meal => {
      const date = new Date(meal.createdAt);
      return date.getHours() + date.getMinutes() / 60;
    });

    const earliestHour = Math.min(...hours);
    const latestHour = Math.max(...hours);

    const formatHour = (hour: number) => {
      const h = Math.floor(hour);
      const m = Math.round((hour - h) * 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    return {
      start: formatHour(earliestHour),
      end: formatHour(latestHour),
    };
  }

  private static calculateIntermittentFasting(meals: any[]): number {
    if (meals.length < 2) return 12; // Default

    // Calculate average time between last meal of day and first meal of next day
    const mealsByDate: { [key: string]: any[] } = {};
    
    meals.forEach(meal => {
      const dateStr = meal.createdAt.toISOString().split('T')[0];
      if (!mealsByDate[dateStr]) mealsByDate[dateStr] = [];
      mealsByDate[dateStr].push(meal);
    });

    const fastingPeriods: number[] = [];
    const dates = Object.keys(mealsByDate).sort();

    for (let i = 0; i < dates.length - 1; i++) {
      const todayMeals = mealsByDate[dates[i]];
      const tomorrowMeals = mealsByDate[dates[i + 1]];

      if (todayMeals.length > 0 && tomorrowMeals.length > 0) {
        const lastMealToday = new Date(Math.max(...todayMeals.map(m => new Date(m.createdAt).getTime())));
        const firstMealTomorrow = new Date(Math.min(...tomorrowMeals.map(m => new Date(m.createdAt).getTime())));

        const fastingHours = (firstMealTomorrow.getTime() - lastMealToday.getTime()) / (1000 * 60 * 60);
        if (fastingHours > 8 && fastingHours < 24) { // Reasonable fasting window
          fastingPeriods.push(fastingHours);
        }
      }
    }

    if (fastingPeriods.length === 0) return 12;

    const averageFasting = fastingPeriods.reduce((sum, period) => sum + period, 0) / fastingPeriods.length;
    return Math.round(averageFasting);
  }
}