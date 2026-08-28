"use client";

import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Icon } from "@surfaces/ui/components/Icon";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function HomeHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);

    return () => {
      document.body.classList.remove("menu-open");
    };
  }, [menuOpen]);

  useEffect(() => {
    function closeAtDesktopWidth() {
      if (window.innerWidth > 820) {
        setMenuOpen(false);
      }
    }

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && menuOpen) {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    window.addEventListener("resize", closeAtDesktopWidth);
    document.addEventListener("keydown", closeWithEscape);

    return () => {
      window.removeEventListener("resize", closeAtDesktopWidth);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="Surfaces home">
          <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
            <polygon points="14,14 50,6 50,19 14,27" />
            <polygon points="10,29 50,29 50,40 10,40" />
            <polygon
              className="brand-mark-muted"
              points="14,43 50,51 50,58 14,50"
            />
          </svg>
          <span>Surfaces</span>
        </Link>

        <button
          ref={menuButtonRef}
          className="menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="menu-button-label">Menu</span>
          <Icon
            className="menu-symbol"
            icon={menuOpen ? XMarkIcon : Bars3Icon}
            size={18}
          />
        </button>

        <nav
          id="site-navigation"
          className="site-navigation"
          aria-label="Primary navigation"
          data-open={menuOpen}
        >
          <a href="#workload" onClick={closeMenu}>
            The workload
          </a>
          <a href="#product-direction" onClick={closeMenu}>
            How it works
          </a>
        </nav>
      </div>
    </header>
  );
}
