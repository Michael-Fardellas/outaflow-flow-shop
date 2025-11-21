import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        nightclub: {
          blue: "hsl(var(--nightclub-blue))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "fade-in-slow": {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          }
        },
        "slide-in": {
          "0%": {
            opacity: "0",
            transform: "translateX(-20px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)"
          }
        },
        "typewriter": {
          "0%": {
            width: "0"
          },
          "100%": {
            width: "100%"
          }
        },
        "blink": {
          "0%, 100%": {
            opacity: "1"
          },
          "50%": {
            opacity: "0"
          }
        },
        "glitch": {
          "0%, 100%": {
            transform: "translate(0)",
            opacity: "1"
          },
          "20%": {
            transform: "translate(-2px, 2px)",
            opacity: "0.8"
          },
          "40%": {
            transform: "translate(-2px, -2px)",
            opacity: "0.8"
          },
          "60%": {
            transform: "translate(2px, 2px)",
            opacity: "0.8"
          },
          "80%": {
            transform: "translate(2px, -2px)",
            opacity: "0.8"
          }
        },
        "pulse-glow": {
          "0%, 100%": {
            opacity: "0.5",
            filter: "brightness(1)"
          },
          "50%": {
            opacity: "1",
            filter: "brightness(1.2)"
          }
        },
        "smoke": {
          "0%": {
            transform: "translateY(0) scale(1)",
            opacity: "0.1"
          },
          "50%": {
            opacity: "0.15"
          },
          "100%": {
            transform: "translateY(-100px) scale(1.2)",
            opacity: "0"
          }
        },
        "float": {
          "0%, 100%": {
            transform: "translateY(0)"
          },
          "50%": {
            transform: "translateY(-20px)"
          }
        },
        "ambient-pulse": {
          "0%, 100%": {
            opacity: "0.8",
            transform: "scale(1)"
          },
          "50%": {
            opacity: "1",
            transform: "scale(1.1)"
          }
        },
        "logo-3d-enter": {
          "0%": {
            opacity: "0",
            transform: "translateZ(-50px) rotateX(10deg)"
          },
          "100%": {
            opacity: "1",
            transform: "translateZ(0) rotateX(0deg)"
          }
        },
        "letter-appear": {
          "0%": {
            opacity: "0"
          },
          "100%": {
            opacity: "1"
          }
        },
        "hero-fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "bounce-arrow": {
          "0%, 100%": {
            transform: "translateY(0)"
          },
          "50%": {
            transform: "translateY(20px)"
          }
        },
        "image-sweep": {
          "0%": {
            transform: "translateY(-100%)"
          },
          "100%": {
            transform: "translateY(100%)"
          }
        },
        "shimmer": {
          "0%, 100%": {
            backgroundPosition: "200% center"
          },
          "50%": {
            backgroundPosition: "-200% center"
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out",
        "fade-in-slow": "fade-in-slow 2s ease-out",
        "slide-in": "slide-in 0.5s ease-out",
        "typewriter": "typewriter 3s steps(40) forwards",
        "blink": "blink 1s step-end infinite",
        "glitch": "glitch 0.3s ease-in-out",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "smoke": "smoke 8s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 3s ease-in-out infinite"
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
