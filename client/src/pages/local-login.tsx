import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function LocalLogin() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; name: string }) => {
      return await apiRequest('/api/auth/local-auth', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Login Successful",
        description: "Welcome to Shist!",
      });
      // Invalidate auth cache to trigger re-fetch
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ email, name: name || 'Local User' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Local Development Login</CardTitle>
          <CardDescription>
            Quick login for local development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-name"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loginMutation.isPending}
              data-testid="button-login"
            >
              {loginMutation.isPending ? 'Logging in...' : 'Login'}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground my-2">or</div>
            
            <Button 
              type="button"
              variant="outline"
              className="w-full" 
              disabled={loginMutation.isPending}
              onClick={() => loginMutation.mutate({ email: 'demo@shist.local', name: 'Demo User' })}
              data-testid="button-demo-login"
            >
              Use Demo Account
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            This is a development-only login. In production, users will authenticate through Replit.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}