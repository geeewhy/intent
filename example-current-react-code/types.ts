
export type UserRole = 'cook' | 'member' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  preferences?: {
    dietaryRestrictions?: string[];
    allergies?: string[];
    favorites?: string[];
  };
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiryDate?: Date;
  isStaple?: boolean;
  lowStockThreshold?: number;
}

export interface NutritionInfo {
  calories: number;
  protein: number; // in grams
  carbs: number; // in grams
  fat: number; // in grams
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  ingredients: {
    ingredientId: string;
    amount: number;
    unit: string;
  }[];
  instructions: string[];
  prepTime: number; // in minutes
  cookTime: number; // in minutes
  servings: number;
  nutrition: NutritionInfo;
  tags: string[];
  approved: boolean;
}

export interface MenuItem {
  id: string;
  recipeId: string;
  name: string;
  description: string;
  imageUrl: string;
  available: boolean;
  nutrition: NutritionInfo;
  tags: string[];
}

export interface Order {
  id: string;
  userId: string;
  items: {
    menuItemId: string;
    quantity: number;
    specialInstructions?: string;
  }[];
  scheduledFor: Date;
  status: 'pending' | 'confirmed' | 'cooking' | 'ready' | 'completed' | 'cancelled';
  createdAt: Date;
}

export interface Household {
  id: string;
  name: string;
  members: {
    userId: string;
    joinedAt: Date;
    role: UserRole;
  }[];
}

export type NotificationType = 'new_order' | 'menu_ready' | 'order_rejected' | 'order_accepted' | 'order_adjustment';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  isActionable: boolean;
  action?: {
    link: string;
    text: string;
  };
  relatedId?: string; // ID of related entity (order, menu, etc.)
}
