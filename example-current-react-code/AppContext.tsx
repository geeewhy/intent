import { createContext, useContext, useState, ReactNode } from "react";
import { User, Ingredient, Recipe, MenuItem, Order, Household, Notification } from "./types";
import { 
  mockUsers, 
  mockIngredients, 
  mockRecipes, 
  mockMenuItems, 
  mockOrders, 
  mockHousehold, 
  mockNotifications,
  getCurrentUser 
} from "./mockData";

interface AppContextType {
  // User state
  currentUser: User;
  setCurrentUser: (user: User) => void;
  users: User[];

  // Pantry/Ingredients
  ingredients: Ingredient[];
  addIngredient: (ingredient: Ingredient) => void;
  updateIngredient: (ingredient: Ingredient) => void;
  removeIngredient: (id: string) => void;

  // Recipes
  recipes: Recipe[];
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (recipe: Recipe) => void;
  removeRecipe: (id: string) => void;

  // Menu
  menuItems: MenuItem[];
  updateMenuItem: (item: MenuItem) => void;

  // Orders
  orders: Order[];
  createOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;

  // Household
  household: Household;
  updateHousehold: (household: Household) => void;

  // Notifications
  notifications: Notification[];
  markNotificationAsRead: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Initialize state with mock data
  const [currentUser, setCurrentUser] = useState<User>(getCurrentUser());
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [ingredients, setIngredients] = useState<Ingredient[]>(mockIngredients);
  const [recipes, setRecipes] = useState<Recipe[]>(mockRecipes);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(mockMenuItems);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [household, setHousehold] = useState<Household>(mockHousehold);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  // Ingredient functions
  const addIngredient = (ingredient: Ingredient) => {
    setIngredients([...ingredients, ingredient]);
  };

  const updateIngredient = (ingredient: Ingredient) => {
    setIngredients(ingredients.map(i => (i.id === ingredient.id ? ingredient : i)));
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(i => i.id !== id));
  };

  // Recipe functions
  const addRecipe = (recipe: Recipe) => {
    setRecipes([...recipes, recipe]);
  };

  const updateRecipe = (recipe: Recipe) => {
    setRecipes(recipes.map(r => (r.id === recipe.id ? recipe : r)));
  };

  const removeRecipe = (id: string) => {
    setRecipes(recipes.filter(r => r.id !== id));
  };

  // Menu Item functions
  const updateMenuItem = (item: MenuItem) => {
    setMenuItems(menuItems.map(m => (m.id === item.id ? item : m)));
  };

  // Order functions
  const createOrder = (order: Order) => {
    setOrders([...orders, order]);
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(
      orders.map(order => 
        order.id === orderId ? { ...order, status } : order
      )
    );
  };

  // Household functions
  const updateHousehold = (newHousehold: Household) => {
    setHousehold(newHousehold);
  };

  // Notification functions
  const markNotificationAsRead = (id: string) => {
    setNotifications(
      notifications.map(notification => 
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  };

  const value = {
    currentUser,
    setCurrentUser,
    users,
    ingredients,
    addIngredient,
    updateIngredient,
    removeIngredient,
    recipes,
    addRecipe,
    updateRecipe,
    removeRecipe,
    menuItems,
    updateMenuItem,
    orders,
    createOrder,
    updateOrderStatus,
    household,
    updateHousehold,
    notifications,
    markNotificationAsRead,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
