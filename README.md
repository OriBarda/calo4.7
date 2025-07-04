# Nutrition Tracker App

A comprehensive nutrition tracking application with AI-powered meal analysis, device integration, and personalized meal planning.

## Features

- 📸 **AI Meal Analysis**: Take photos of meals for automatic nutrition analysis
- 📱 **Device Integration**: Connect Apple Health, Google Fit, Fitbit, and more
- 📅 **Calendar Tracking**: Visual nutrition tracking with progress indicators
- 🤖 **AI Meal Planning**: Personalized meal plans based on your goals
- 📊 **Statistics**: Detailed nutrition analytics and insights
- 🏃‍♂️ **Activity Tracking**: Calorie balance with activity data

## Tech Stack

**Client (React Native/Expo):**
- React Native with Expo
- Redux Toolkit for state management
- React Query for data fetching
- Expo Camera for meal photos
- Secure token storage

**Server (Node.js):**
- Express.js with TypeScript
- Prisma ORM with PostgreSQL
- OpenAI GPT-4 Vision for meal analysis
- JWT authentication
- Device API integrations

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- OpenAI API key
- Expo CLI (`npm install -g @expo/cli`)

### Database Setup

1. **Create PostgreSQL Database:**
   ```bash
   createdb nutrition_tracker
   ```

2. **Set up environment variables:**
   ```bash
   # Server
   cd server
   cp .env.example .env
   # Edit .env with your database URL and API keys
   
   # Client
   cd ../client
   cp .env.example .env
   # Edit .env with your API configuration
   ```

3. **Install dependencies and setup database:**
   ```bash
   # Server
   cd server
   npm install
   npx prisma generate
   npx prisma db push
   
   # Client
   cd ../client
   npm install
   ```

### Running the Application

1. **Start the server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Start the client:**
   ```bash
   cd client
   npm start
   ```

3. **Run on device/simulator:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

### Environment Variables

**Server (.env):**
```env
DATABASE_URL="postgresql://username:password@localhost:5432/nutrition_tracker"
DIRECT_URL="postgresql://username:password@localhost:5432/nutrition_tracker"
JWT_SECRET="your-super-secret-jwt-key"
OPENAI_API_KEY="your-openai-api-key"
PORT=5000
NODE_ENV=development
CLIENT_URL="http://localhost:8081"
```

**Client (.env):**
```env
EXPO_PUBLIC_API_URL="http://192.168.1.70:5000"
```

### Device Integration Setup

To enable device integrations, you'll need to:

1. **Apple Health (iOS only):**
   - Add HealthKit capability in Xcode
   - Configure health permissions

2. **Google Fit (Android):**
   - Set up Google Cloud Console project
   - Enable Fitness API
   - Add OAuth credentials

3. **Third-party devices (Fitbit, Garmin, etc.):**
   - Register developer accounts
   - Obtain API keys and configure OAuth

### API Endpoints

**Authentication:**
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout

**Nutrition:**
- `POST /api/nutrition/analyze` - Analyze meal photo
- `POST /api/nutrition/save` - Save meal data
- `GET /api/nutrition/meals` - Get user meals
- `GET /api/nutrition/stats/:date` - Get daily nutrition stats

**Devices:**
- `GET /api/devices` - Get connected devices
- `POST /api/devices/connect` - Connect new device
- `POST /api/devices/:id/sync` - Sync device data

**Meal Plans:**
- `POST /api/meal-plans/create` - Create AI meal plan
- `GET /api/meal-plans/current` - Get current meal plan
- `PUT /api/meal-plans/:id/replace` - Replace meal with AI alternative

## Usage

1. **Sign up** for a new account or **sign in**
2. **Take a photo** of your meal using the camera tab
3. **Review** the AI analysis and **save** the meal
4. **Connect devices** for activity tracking
5. **View progress** on the calendar and statistics tabs
6. **Generate meal plans** using AI recommendations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.