import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function logout(): Promise<void> {
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  // Mock user for disabled auth
  const mockUser: User = {
    id: "dev-user-id",
    email: "dev@example.com",
    firstName: "Developer",
    lastName: "User",
    profileImageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
    logout: () => { window.location.href = "/"; },
    isLoggingOut: false,
  };
}
