"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@/utils/supabase/client";
import { getUserRole, signOutUser } from "@/actions/userActions";

/**
 * A hook to protect routes based on user roles
 * @param requiredRole The role required to access the route
 * @returns Session and user information if authorized
 */
export function useRequireRole(requiredRole: string) {
  const router = useRouter();
  const [supabaseClient] = useState(() => createClient());
  const [session, setSession] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to get user's role from profiles table using the action
  const getUserRoleFromProfile = async (userId: string) => {
    // Use the getUserRole action instead of directly querying supabase
    const { data, error } = await getUserRole(userId);
    
    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
    
    return data;
  };

  useEffect(() => {
    const checkAuth = async () => {
      //console.log(`useRequireRole: Checking auth for ${requiredRole}`);
      
      // Get current session
      const { data } = await supabaseClient.auth.getSession();
      const currentSession = data.session;
      setSession(currentSession);
      
      // If no session, redirect to auth page for the required role
      if (!currentSession) {
        console.log(`No session found. Redirecting to /auth/${requiredRole}`);
        router.replace(`/auth/${requiredRole}`);
        setIsLoading(false);
        return;
      }

      // Get user metadata to check role
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        console.log(`No user found. Redirecting to /auth/${requiredRole}`);
        router.replace(`/auth/${requiredRole}`);
        setIsLoading(false);
        return;
      }

      // First get user's role from the profiles table rather than relying on app_metadata
      const userRole = await getUserRoleFromProfile(user.id);
      //console.log(`User role from profiles table: ${userRole}`);

      // If user doesn't have the required role, sign them out and redirect to auth page for the required role
      if (userRole && userRole !== requiredRole) {
        console.log(
          `User role (${userRole}) doesn't match required role (${requiredRole}). Signing out and redirecting to auth/${requiredRole}`
        );
        
        // Sign out the user using the action
        const { error: signOutError } = await signOutUser();
        if (signOutError) {
          console.error("Error signing out:", signOutError);
        }
        
        // Redirect to the auth page for the required role
        router.replace(`/auth/${requiredRole}`);
        setIsLoading(false);
        return;
      } else if (!userRole) {
        // No role found
        console.log("No role found in user profile. Redirecting to auth.");
        const { error: signOutError } = await signOutUser();
        if (signOutError) {
          console.error("Error signing out:", signOutError);
        }
        router.replace(`/auth/${requiredRole}`);
        setIsLoading(false);
        return;
      }

      //console.log(`useRequireRole: User ${user.email} authorized as ${requiredRole}`);
      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [supabaseClient, requiredRole, router]);

  const result = {
    session,
    user: session?.user,
    isAuthorized,
    isLoading,
  };
  
  //console.log(`useRequireRole result for ${requiredRole}:`, result);
  
  return result;
}

export default useRequireRole;
