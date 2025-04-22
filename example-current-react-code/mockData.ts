import {User, Ingredient, Recipe, MenuItem, Order, Household, Notification, NotificationType} from "./types";

const houseHold = 'house1';

// Mock Users
export const mockUsers: User[] = [
    {
        id: "user1",
        name: "Shiyi Chen",
        role: "cook",
        preferences: {
            dietaryRestrictions: [],
            allergies: [],
            favorites: ["recipe1", "recipe3"],
        },
    },
    {
        id: "user2",
        name: "Gokce Yalcin",
        role: "member",
        preferences: {
            dietaryRestrictions: ["vegetarian"],
            allergies: ["nuts"],
            favorites: ["recipe2"],
        },
    },
    {
        id: "user3",
        name: "Momo the Cat",
        role: "member",
        preferences: {
            dietaryRestrictions: ["gluten-free"],
            allergies: [],
            favorites: ["recipe4"],
        },
    },
    {
        id: "user4",
        name: "Hugo the Cat",
        role: "admin",
        preferences: {
            dietaryRestrictions: [],
            allergies: ["seafood"],
            favorites: ["recipe5"],
        },
    },
    {
        id: "user5",
        name: "Twixie the Cat",
        role: "member",
        preferences: {
            dietaryRestrictions: ["vegan"],
            allergies: [],
            favorites: ["recipe6"],
        },
    },
];

// Mock Ingredients
export const mockIngredients: Ingredient[] = [
    {
        id: "ing1",
        name: "Chicken Breast",
        quantity: 5,
        unit: "lb",
        category: "meat",
        expiryDate: new Date("2023-12-30"),
        isStaple: false,
    },
    {
        id: "ing2",
        name: "Rice",
        quantity: 10,
        unit: "lb",
        category: "grain",
        isStaple: true,
        lowStockThreshold: 2,
    },
    {
        id: "ing3",
        name: "Tomatoes",
        quantity: 8,
        unit: "pieces",
        category: "vegetable",
        expiryDate: new Date("2023-12-20"),
        isStaple: false,
    },
    {
        id: "ing4",
        name: "Olive Oil",
        quantity: 1,
        unit: "bottle",
        category: "pantry",
        isStaple: true,
        lowStockThreshold: 1,
    },
    {
        id: "ing5",
        name: "Pasta",
        quantity: 3,
        unit: "boxes",
        category: "grain",
        isStaple: true,
        lowStockThreshold: 1,
    },
    {
        id: "ing6",
        name: "Onions",
        quantity: 5,
        unit: "pieces",
        category: "vegetable",
        isStaple: true,
        lowStockThreshold: 2,
    },
    {
        id: "ing7",
        name: "Ground Beef",
        quantity: 3,
        unit: "lb",
        category: "meat",
        expiryDate: new Date("2023-12-25"),
        isStaple: false,
    },
    {
        id: "ing8",
        name: "Cheese",
        quantity: 2,
        unit: "lb",
        category: "dairy",
        expiryDate: new Date("2023-12-28"),
        isStaple: false,
    },
    {
        id: "ing9",
        name: "Bell Peppers",
        quantity: 4,
        unit: "pieces",
        category: "vegetable",
        expiryDate: new Date("2023-12-22"),
        isStaple: false,
    },
    {
        id: "ing10",
        name: "Garlic",
        quantity: 1,
        unit: "bulb",
        category: "vegetable",
        isStaple: true,
        lowStockThreshold: 1,
    },
];

// Mock Recipes
export const mockRecipes: Recipe[] = [
    {
        id: "recipe1",
        name: "Chicken Stir Fry",
        description: "A quick and easy stir fry with chicken and seasonal vegetables.",
        imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y2hpY2tlbiUyMHN0aXIlMjBmcnl8ZW58MHx8MHx8fDA%3D",
        ingredients: [
            {ingredientId: "ing1", amount: 1, unit: "lb"},
            {ingredientId: "ing3", amount: 2, unit: "pieces"},
            {ingredientId: "ing6", amount: 1, unit: "piece"},
            {ingredientId: "ing10", amount: 2, unit: "cloves"},
            {ingredientId: "ing9", amount: 1, unit: "piece"},
            {ingredientId: "ing4", amount: 2, unit: "tbsp"},
            {ingredientId: "ing2", amount: 2, unit: "cups"},
        ],
        instructions: [
            "Cook rice according to package instructions.",
            "Cut chicken into bite-sized pieces.",
            "Chop all vegetables.",
            "Heat oil in a wok or large frying pan.",
            "Add chicken and cook until no longer pink.",
            "Add vegetables and stir fry until tender-crisp.",
            "Season with soy sauce and serve over rice."
        ],
        prepTime: 15,
        cookTime: 20,
        servings: 4,
        nutrition: {
            calories: 420,
            protein: 35,
            carbs: 45,
            fat: 12,
        },
        tags: ["high-protein", "quick", "healthy"],
        approved: true,
    },
    {
        id: "recipe2",
        name: "Veggie Pasta",
        description: "Delicious pasta loaded with fresh seasonal vegetables.",
        imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8dmVnZ2llJTIwcGFzdGF8ZW58MHx8MHx8fDA%3D",
        ingredients: [
            {ingredientId: "ing5", amount: 1, unit: "box"},
            {ingredientId: "ing3", amount: 3, unit: "pieces"},
            {ingredientId: "ing6", amount: 1, unit: "piece"},
            {ingredientId: "ing10", amount: 3, unit: "cloves"},
            {ingredientId: "ing9", amount: 2, unit: "pieces"},
            {ingredientId: "ing4", amount: 3, unit: "tbsp"},
        ],
        instructions: [
            "Cook pasta according to package instructions.",
            "Chop all vegetables.",
            "Heat oil in a large frying pan.",
            "Add garlic and onion, sauté until fragrant.",
            "Add remaining vegetables and cook until tender-crisp.",
            "Toss with pasta and olive oil.",
            "Season with salt, pepper, and Italian herbs."
        ],
        prepTime: 10,
        cookTime: 15,
        servings: 4,
        nutrition: {
            calories: 380,
            protein: 12,
            carbs: 65,
            fat: 8,
        },
        tags: ["vegetarian", "quick", "pasta"],
        approved: true,
    },
    {
        id: "recipe3",
        name: "Classic Spaghetti Bolognese",
        description: "Traditional Italian meat sauce served with spaghetti.",
        imageUrl: "https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8c3BhZ2hldHRpJTIwYm9sb2duZXNlfGVufDB8fDB8fHww",
        ingredients: [
            {ingredientId: "ing5", amount: 1, unit: "box"},
            {ingredientId: "ing7", amount: 1, unit: "lb"},
            {ingredientId: "ing3", amount: 4, unit: "pieces"},
            {ingredientId: "ing6", amount: 1, unit: "piece"},
            {ingredientId: "ing10", amount: 2, unit: "cloves"},
            {ingredientId: "ing4", amount: 2, unit: "tbsp"},
        ],
        instructions: [
            "Cook spaghetti according to package instructions.",
            "In a large pan, brown ground beef.",
            "Add chopped onion and garlic, sauté until fragrant.",
            "Add chopped tomatoes and tomato paste.",
            "Season with Italian herbs, salt, and pepper.",
            "Simmer for 20 minutes.",
            "Serve sauce over cooked spaghetti."
        ],
        prepTime: 10,
        cookTime: 30,
        servings: 4,
        nutrition: {
            calories: 520,
            protein: 28,
            carbs: 60,
            fat: 18,
        },
        tags: ["pasta", "Italian", "hearty"],
        approved: true,
    },
    {
        id: "recipe4",
        name: "Stuffed Bell Peppers",
        description: "Bell peppers filled with a savory mixture of rice, ground beef, and spices.",
        imageUrl: "https://images.unsplash.com/photo-1662984003099-799b9101f02a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OXx8c3R1ZmZlZCUyMHBlcHBlcnN8ZW58MHx8MHx8fDA%3D",
        ingredients: [
            {ingredientId: "ing9", amount: 4, unit: "pieces"},
            {ingredientId: "ing7", amount: 0.75, unit: "lb"},
            {ingredientId: "ing2", amount: 1, unit: "cup"},
            {ingredientId: "ing6", amount: 1, unit: "piece"},
            {ingredientId: "ing10", amount: 2, unit: "cloves"},
            {ingredientId: "ing8", amount: 0.5, unit: "cup"},
        ],
        instructions: [
            "Cook rice according to package instructions.",
            "Preheat oven to 350°F (175°C).",
            "Cut tops off bell peppers and remove seeds.",
            "In a pan, brown ground beef with onion and garlic.",
            "Mix beef with cooked rice, half the cheese, and seasonings.",
            "Fill bell peppers with the mixture.",
            "Top with remaining cheese.",
            "Bake for 25-30 minutes until peppers are tender."
        ],
        prepTime: 20,
        cookTime: 30,
        servings: 4,
        nutrition: {
            calories: 340,
            protein: 22,
            carbs: 30,
            fat: 14,
        },
        tags: ["gluten-free", "baked", "hearty"],
        approved: true,
    },
    {
        id: "recipe5",
        name: "Creamy Garlic Chicken",
        description: "Tender chicken breasts in a rich, creamy garlic sauce.",
        imageUrl: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OXx8Y3JlYW15JTIwY2hpY2tlbnxlbnwwfHwwfHx8MA%3D%3D",
        ingredients: [
            {ingredientId: "ing1", amount: 1.5, unit: "lb"},
            {ingredientId: "ing10", amount: 4, unit: "cloves"},
            {ingredientId: "ing4", amount: 2, unit: "tbsp"},
            {ingredientId: "ing8", amount: 0.25, unit: "cup"},
        ],
        instructions: [
            "Season chicken breasts with salt and pepper.",
            "Heat olive oil in a large skillet over medium-high heat.",
            "Sear chicken 5-6 minutes per side until golden brown.",
            "Remove chicken, lower heat, add minced garlic to the skillet.",
            "Pour in cream, bring to simmer.",
            "Return chicken to skillet, simmer 10 minutes until sauce thickens.",
            "Sprinkle with grated cheese and serve."
        ],
        prepTime: 10,
        cookTime: 25,
        servings: 4,
        nutrition: {
            calories: 420,
            protein: 38,
            carbs: 4,
            fat: 28,
        },
        tags: ["low-carb", "keto-friendly", "high-protein"],
        approved: true,
    },
];

// Mock Menu Items (based on recipes)
export const mockMenuItems: MenuItem[] = mockRecipes.map(recipe => ({
    id: `menu-${recipe.id}`,
    recipeId: recipe.id,
    name: recipe.name,
    description: recipe.description,
    imageUrl: recipe.imageUrl,
    available: true,
    nutrition: recipe.nutrition,
    tags: recipe.tags,
}));

// Mock Orders
export const mockOrders: Order[] = [
    {
        id: "order1",
        userId: "user2",
        items: [
            {menuItemId: "menu-recipe2", quantity: 1},
            {menuItemId: "menu-recipe3", quantity: 1, specialInstructions: "Extra cheese please"},
        ],
        scheduledFor: new Date("2023-12-15T18:30:00"),
        status: "confirmed",
        createdAt: new Date("2023-12-14T09:15:00"),
    },
    {
        id: "order2",
        userId: "user3",
        items: [
            {menuItemId: "menu-recipe4", quantity: 2},
        ],
        scheduledFor: new Date("2023-12-15T19:00:00"),
        status: "pending",
        createdAt: new Date("2023-12-14T10:30:00"),
    },
    {
        id: "order3",
        userId: "user4",
        items: [
            {menuItemId: "menu-recipe1", quantity: 1},
            {menuItemId: "menu-recipe5", quantity: 1},
        ],
        scheduledFor: new Date("2023-12-16T18:00:00"),
        status: "pending",
        createdAt: new Date("2023-12-14T14:45:00"),
    },
];

// Mock Household
export const mockHousehold: Household = {
    id: "house1",
    name: "The Foodies",
    members: [
        {userId: "user1", joinedAt: new Date("2023-01-01"), role: "cook"},
        {userId: "user2", joinedAt: new Date("2023-01-02"), role: "member"},
        {userId: "user3", joinedAt: new Date("2023-01-05"), role: "member"},
        {userId: "user4", joinedAt: new Date("2023-01-01"), role: "admin"},
    ],
};

export const getCurrentUser = (): User => {
    // For demo purposes, return the cook user by default
    return mockUsers.find(user => user.id === "user1")!;
};

// Mock Notifications
export const mockNotifications: Notification[] = [
    {
        id: "notif1",
        type: "new_order",
        title: "New Order Received",
        message: "You have received a new order from Gokce Yalcin.",
        isRead: false,
        createdAt: new Date("2023-12-14T10:30:00"),
        isActionable: true,
        action: {
            link: "/orders",
            text: "View Order"
        },
        relatedId: "order2"
    },
    {
        id: "notif2",
        type: "menu_ready",
        title: "Today's Menu is Ready",
        message: "The menu for today has been updated with new dishes.",
        isRead: true,
        createdAt: new Date("2023-12-14T08:00:00"),
        isActionable: true,
        action: {
            link: "/menu",
            text: "View Menu"
        }
    },
    {
        id: "notif3",
        type: "order_rejected",
        title: "Order Rejected",
        message: "Your order for Veggie Pasta has been rejected. The cook is unavailable at the requested time.",
        isRead: false,
        createdAt: new Date("2023-12-13T16:45:00"),
        isActionable: false,
        relatedId: "order1"
    },
    {
        id: "notif4",
        type: "order_accepted",
        title: "Order Accepted",
        message: "Your order for Stuffed Bell Peppers has been accepted and will be ready at the scheduled time.",
        isRead: true,
        createdAt: new Date("2023-12-13T11:20:00"),
        isActionable: true,
        action: {
            link: "/orders/order2",
            text: "View Order Details"
        },
        relatedId: "order2"
    },
    {
        id: "notif5",
        type: "order_adjustment",
        title: "Order Adjustment Request",
        message: "The cook has requested an adjustment to your order. Please review the changes.",
        isRead: false,
        createdAt: new Date("2023-12-12T14:10:00"),
        isActionable: true,
        action: {
            link: "/orders/order3/adjust",
            text: "Review Adjustments"
        },
        relatedId: "order3"
    }
];
