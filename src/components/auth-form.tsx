"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
// Previously: import { auth } from "@/lib/firebase";
import { auth } from "@/lib/firebase-client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Define form validation schema
const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
});

interface AuthFormProps {
  onSuccess?: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, values.email, values.password);
      } else {
        await createUserWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );
      }
      // On success, navigate to the home page or close the dialog
      console.log("Authentication successful!");
      onSuccess?.();
    } catch (err: unknown) {
      // Check if err is an Error object
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle Google login
  async function handleGoogleLogin() {
    setIsLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      console.log("Google login successful!");
      onSuccess?.();
    } catch (err: unknown) {
      // Check if err is an Error object
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center">
        {isLogin ? t("login") : t("register")}
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="name@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Loading..." : isLogin ? t("login") : t("register")}
          </Button>
        </form>
      </Form>

      <div className="relative">
        <Separator className="absolute inset-0 flex items-center h-px -z-10 bg-gray-200" />
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">or continue with</span>
        </div>
      </div>

      <Button
        onClick={handleGoogleLogin}
        variant="outline"
        className="w-full"
        disabled={isLoading}
      >
        Sign in with Google
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline"
          >
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
