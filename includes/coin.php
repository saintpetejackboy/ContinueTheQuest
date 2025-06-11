<?php
/**
 * Standalone, Namespaced Spinning Coin SVG
 * Path: includes/coin.php
 */
?>
<span class="ctq-coin-spin-wrap">
  <span class="ctq-coin-spin">
    <svg viewBox="0 0 80 80" class="ctq-coin-spin-svg" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32" aria-hidden="true">
      <circle cx="40" cy="40" r="36" stroke="#43C77E" stroke-width="4" fill="url(#ctq-gradient)"/>
      <text x="40" y="37" text-anchor="middle" font-size="19" font-weight="bold" fill="#fff" font-family="Montserrat,Arial,sans-serif">$</text>
      <text x="40" y="57" text-anchor="middle" font-size="8" fill="gold" font-family="Montserrat,Arial,sans-serif">CTQ</text>
      <defs>
        <radialGradient id="ctq-gradient" cx="0.4" cy="0.35" r="0.85">
          <stop offset="0%" stop-color="gold"/>
          <stop offset="100%" stop-color="yellow"/>
        </radialGradient>
      </defs>
    </svg>
  </span>
</span>

<style>
.ctq-coin-spin-wrap {
  display: inline-block;
  vertical-align: middle;
  /* Tweak size below as needed; SVG is 32x32px by default */
  width: 1.7em;
  height: 1.7em;
  line-height: 1;
  margin: 0 0.1em;
}
.ctq-coin-spin {
  display: inline-block;
  width: 100%;
  height: 100%;
  /* 3D spinning effect */
  animation: ctq-coin-spin-anim 1.2s linear infinite;
  transform-style: preserve-3d;
  will-change: transform;
    text-shadow: 0px 0px 4px white;
   border-radius: 50%;
}
.ctq-coin-spin-svg {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  /* Prevent select/drag, etc. */
  user-select: none;

}
@keyframes ctq-coin-spin-anim {
  0%   { transform: rotateY(0deg); box-shadow: 0px 0px 10px yellow; }
  100% { transform: rotateY(360deg); box-shadow: 0px 0px 40px white;	 }
}
</style>
