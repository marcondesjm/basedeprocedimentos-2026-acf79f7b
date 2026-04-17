import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useAppVersion } from "@/hooks/useAppVersion";
import { toast } from "sonner";
import { Shield, RefreshCw, Trash2, LogIn, Sun, Moon, Eye, EyeOff } from "lucide-react";

const APP_VERSION = String(__APP_VERSION__).replace(/^v/i, '');
const BUILD_TIMESTAMP = String(__BUILD_TIMESTAMP__);

const MatrixBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shipRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Matrix effect setup
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}[]<>@^~";
    const fontSize = 14;
    const columns = Math.ceil(canvas.width / fontSize);
    let drops: number[] = new Array(columns).fill(1).map(() => Math.random() * -100);

    // Starfield
    const stars: { x: number; y: number; size: number; speed: number; brightness: number }[] = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        speed: Math.random() * 0.5 + 0.1,
        brightness: Math.random()
      });
    }

    // Game state
    let enemies: any[] = [];
    let bullets: any[] = [];
    let score = 0;
    let combo = 0;
    let lastKillTime = 0;
    let highscore = Number(localStorage.getItem('space_shooter_highscore') || 0);

    const spawnEnemy = () => {
      const size = Math.random() * 20 + 10;
      enemies.push({
        x: Math.random() * canvas.width,
        y: -size,
        size,
        speed: Math.random() * 2 + 1,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        rotation: 0,
        rotSpeed: Math.random() * 0.1 - 0.05
      });
    };

    const animate = () => {
      if (!ctx) return;
      
      // Clear with slight trail
      ctx.fillStyle = 'rgba(0, 5, 12, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stars
      ctx.fillStyle = '#fff';
      stars.forEach(s => {
        s.y += s.speed;
        if (s.y > canvas.height) s.y = 0;
        ctx.globalAlpha = s.brightness;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Matrix drops
      ctx.fillStyle = '#0F0';
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      // Ship
      const ship = shipRef.current;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f6ff';
      ctx.fillStyle = '#00f6ff';
      ctx.beginPath();
      ctx.moveTo(ship.x, ship.y - 15);
      ctx.lineTo(ship.x - 12, ship.y + 12);
      ctx.lineTo(ship.x + 12, ship.y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Bullets
      bullets = bullets.filter(b => b.y > 0);
      bullets.forEach(b => {
        b.y -= 8;
        ctx.fillStyle = '#fff';
        ctx.fillRect(b.x - 2, b.y - 8, 4, 16);
      });

      // Enemies
      enemies = enemies.filter(e => e.y < canvas.height + 50);
      enemies.forEach((e, idx) => {
        e.y += e.speed;
        e.rotation += e.rotSpeed;
        
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rotation);
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-e.size/2, -e.size/2, e.size, e.size);
        ctx.restore();

        // Collision
        bullets.forEach((b, bIdx) => {
          const dist = Math.hypot(b.x - e.x, b.y - e.y);
          if (dist < e.size) {
            enemies.splice(idx, 1);
            bullets.splice(bIdx, 1);
            score += 10;
            combo++;
            lastKillTime = Date.now();
            if (score > highscore) {
              highscore = score;
              localStorage.setItem('space_shooter_highscore', String(highscore));
            }
          }
        });
      });

      if (Math.random() < 0.05) spawnEnemy();
      if (Date.now() - lastKillTime > 2000) combo = 0;

      // HUD
      ctx.fillStyle = '#00f6ff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`SCORE: ${score.toString().padStart(5, '0')}`, 20, 30);
      ctx.fillText(`BEST: ${highscore.toString().padStart(5, '0')}`, 20, 50);
      if (combo > 1) {
        ctx.fillStyle = '#ff00ff';
        ctx.fillText(`COMBO x${combo}!`, 20, 70);
      }

      animationId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => { shipRef.current = { x: e.clientX, y: e.clientY }; };
    const handleClick = () => { bullets.push({ x: shipRef.current.x, y: shipRef.current.y }); };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleClick);
    
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" />;
};

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
        localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const navigate = useNavigate();
  const { isAppUpToDate: isUpToDate, lastUpdated, isSyncing, refreshApp } = useAppVersion(APP_VERSION, BUILD_TIMESTAMP);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

  const handleForceSync = async () => {
    toast.info('🔄 Limpando cache e atualizando...');
    await refreshApp();
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Email ou senha incorretos");
      } else {
        toast.success("Login realizado com sucesso!");
        navigate("/");
      }
    } catch {
      toast.error("Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) toast.error("Erro ao fazer login com Google");
    } catch {
      toast.error("Erro ao conectar com Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <MatrixBackground />

      <div className="relative z-10 w-full flex flex-col items-center px-3 sm:px-4 py-4 gap-3 sm:gap-4 max-w-md mx-auto">
        <div className="w-full text-center text-white">
          <p className="text-lg sm:text-xl font-bold tracking-wide font-mono">
            DATA: {currentDateTime.toLocaleDateString('pt-BR')}, {currentDateTime.toLocaleTimeString('pt-BR')}
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/80 text-white text-[10px] font-bold shadow-sm animate-pulse-slow">
          <Badge variant="outline" className="text-[9px] border-white/20 text-white font-mono bg-white/5 h-4 px-1">v3.0.0</Badge>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ✓ ATUALIZADO
          </span>
        </div>

        <div className="w-full flex flex-wrap items-center justify-between rounded-xl bg-white/5 backdrop-blur-md border border-white/10 px-3 sm:px-4 py-2 text-white text-xs gap-2">
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px] sm:text-xs opacity-50">
                • Atualizado: {new Date(lastUpdated).toLocaleDateString('pt-BR')} {new Date(lastUpdated).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            {isUpToDate === true && (
              <span className="text-emerald-400 flex items-center gap-1 text-[10px] sm:text-xs">✓ Atualizado</span>
            )}
            {isUpToDate === false && (
              <span className="text-amber-400 flex items-center gap-1 text-[10px] sm:text-xs">⚠ Desatualizado</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleForceSync}
              disabled={isSyncing}
              className="h-6 sm:h-7 px-1.5 sm:px-2 text-white hover:bg-white/10 text-[10px] sm:text-xs gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              Verificar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDark(!isDark)}
              className="h-6 sm:h-7 px-1.5 sm:px-2 text-white hover:bg-white/10 text-[10px] sm:text-xs gap-1"
            >
              {isDark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
              {isDark ? 'Claro' : 'Escuro'}
            </Button>
          </div>
        </div>

        {/* Login Card */}
        <Card className="w-full border-0 shadow-2xl bg-card/80 backdrop-blur-xl animate-fade-in">
          <CardHeader className="text-center space-y-3 pb-2 px-4 sm:px-6 pt-5 sm:pt-6">
            <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold">Gestão de Procedimentos</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Faça login para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-5 pt-3 sm:pt-4 px-4 sm:px-6 pb-5 sm:pb-6">
            {/* Email/Password */}
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 sm:h-11 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs sm:text-sm">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 sm:h-11 text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-10 sm:h-11 gap-2 text-sm">
                <LogIn className="w-4 h-4" />
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card/80 px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            {/* Google */}
            <Button
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full h-10 sm:h-11 text-sm gap-3"
              variant="outline"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {isGoogleLoading ? "Conectando..." : "Entrar com Google"}
            </Button>

            <p className="text-center text-[10px] sm:text-xs text-muted-foreground pt-1">
              Desenvolvido por Marcondes Jorge Machado
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
