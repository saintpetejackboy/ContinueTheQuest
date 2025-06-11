<?php
/**
 * Standalone Coin Component (mini, animated, bouncing & spinning)
 * Path: includes/coin.php
 */
?>
<div class="ctq-coin-sm-wrapper">
  <div class="ctq-coin-sm">
    <div class="ctq-coin-sm__front">
      <span class="ctq-coin-sm__currency">$</span>
      <span class="ctq-coin-sm__top">Quest</span>
      <span class="ctq-coin-sm__bottom">CTQ</span>
    </div>
    <div class="ctq-coin-sm__shadow"></div>
  </div>
</div>

<style>
/* Sane defaults and isolation */
.ctq-coin-sm-wrapper {
  display: inline-block;
  pointer-events: none;
  user-select: none;
  /* scale down further if you want: */
  transform: scale(0.32);
}

/* Coin container handles spin+bounce */
.ctq-coin-sm {
  position: relative;
  width: 80px; /* native size; scales with wrapper */
  height: 80px;
  animation:
    ctq-coin-sm-bounce 1.6s cubic-bezier(.44,1.62,.63,1) infinite,
    ctq-coin-sm-spin 2.5s linear infinite;
  will-change: transform;
}

/* Coin face */
.ctq-coin-sm__front {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle at 60% 30%, #ffe082 55%, #ffc107 95%, #9e7400 100%);
  box-shadow: 0 4px 20px #0004, 0 0 0 4px #ffe082 inset;
  position: absolute; top: 0; left: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border: 3.5px solid #ffd54f;
  z-index: 2;
  /* 3D tilt on spin for realism */
  animation: ctq-coin-sm-tilt 2.5s linear infinite;
  will-change: transform;
}

.ctq-coin-sm__currency {
  font-size: 2.2em;
  font-weight: 900;
  color: #ffc107;
  text-shadow: 0 2px 2px #a57e00, 0 0 6px #fff8;
  margin-bottom: 0.09em;
  letter-spacing: -0.04em;
  line-height: 1;
  font-family: "Montserrat", "Arial Black", sans-serif;
  z-index: 3;
}

.ctq-coin-sm__top,
.ctq-coin-sm__bottom {
  font-size: 0.78em;
  font-weight: 700;
  color: #c3870a;
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-shadow: 0 1px 0 #fff9;
  line-height: 1;
  position: absolute; left: 50%; transform: translateX(-50%);
  font-family: "Montserrat", "Arial Black", sans-serif;
  z-index: 4;
  user-select: none;
}

.ctq-coin-sm__top    { top: 11%; }
.ctq-coin-sm__bottom { bottom: 11%; }

.ctq-coin-sm__shadow {
  position: absolute;
  left: 50%; bottom: -8px;
  width: 54px; height: 12px;
  background: radial-gradient(ellipse at center, #0003 70%, #0000 100%);
  border-radius: 50%;
  transform: translateX(-50%);
  z-index: 1;
  animation: ctq-coin-sm-shadow 1.6s cubic-bezier(.44,1.62,.63,1) infinite;
  will-change: transform, opacity;
}

/* Animations */
@keyframes ctq-coin-sm-bounce {
  0%   { transform: translateY(0); }
  15%  { transform: translateY(-20px); }
  35%  { transform: translateY(-36px); }
  50%  { transform: translateY(-40px); }
  70%  { transform: translateY(-18px); }
  100% { transform: translateY(0); }
}
@keyframes ctq-coin-sm-shadow {
  0%   { opacity: .6; transform: translateX(-50%) scaleX(1) scaleY(1); }
  35%  { opacity: .24; transform: translateX(-50%) scaleX(1.16) scaleY(0.68);}
  50%  { opacity: .18; transform: translateX(-50%) scaleX(1.22) scaleY(0.5);}
  70%  { opacity: .30; transform: translateX(-50%) scaleX(1.08) scaleY(0.9);}
  100% { opacity: .6; transform: translateX(-50%) scaleX(1) scaleY(1);}
}
@keyframes ctq-coin-sm-spin {
  0% { transform: rotateZ(0deg); }
  100% { transform: rotateZ(360deg);}
}
@keyframes ctq-coin-sm-tilt {
  0%   { transform: perspective(260px) rotateY(-12deg);}
  33%  { transform: perspective(260px) rotateY(15deg);}
  66%  { transform: perspective(260px) rotateY(-17deg);}
  100% { transform: perspective(260px) rotateY(-12deg);}
}
</style>
