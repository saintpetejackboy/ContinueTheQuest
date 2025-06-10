<?php
/**
 * Standalone coin component
 * Path: includes/coin.php
 */
?>
<div class="ctq-coin-wrapper">
  <div class="ctq-coin">
    <div class="ctq-coin__front ctq-coin__jump">
      <div class="ctq-coin__star"></div>
      <span class="ctq-coin__currency">$</span>
      <div class="ctq-coin__shapes">
        <div class="ctq-coin__shape_l"></div>
        <div class="ctq-coin__shape_r"></div>
        <span class="ctq-coin__top">Quest</span>
        <span class="ctq-coin__bottom">CTQ</span>
      </div>
    </div>
    <div class="ctq-coin__shadow"></div>
  </div>
</div>

<style>
.ctq-coin-wrapper {
  display: inline-block;
  transform: scale(0.4);
  transform-origin: center center;
}

.ctq-coin {
  position: relative;
  width: 150px;
  height: 150px;
}

.ctq-coin__jump {
  animation: ctq-jump 1.5s infinite ease;
  position: relative;
}

@keyframes ctq-jump {
  0%   { top: 0; }
  50%  { top: -40px; }
  100% { top: 0; }
}

@keyframes ctq-shine {
  0%   { margin: 20px -65px; }
  50%  { margin: 70px -85px; }
  100% { margin: 20px -65px; }
}

@keyframes ctq-swift {
  0%   { opacity: 0.8; }
  50%  { opacity: 0.4; transform: scale(0.8); }
  100% { opacity: 0.8; }
}

.ctq-coin__front,
.ctq-coin__back {
  position: absolute;
  width: 150px;
  height: 150px;
  background: #ffbd0b;
  border-radius: 50%;
  border-top: 7px solid #ffd84c;
  border-left: 7px solid #ffd84c;
  border-right: 7px solid #d57e08;
  border-bottom: 7px solid #d57e08;
  transform: rotate(44deg);
}

.ctq-coin__front::before,
.ctq-coin__back::before {
  content: "";
  margin: 35.5px;
  position: absolute;
  width: 70px;
  height: 70px;
  background: #f0a608;
  border-radius: 50%;
  border: 5px solid #d57e08;
  border-bottom-color: #ffd84c;
  border-right-color: #ffd84c;
  z-index: 2;
}

.ctq-coin__currency {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%) rotate(-44deg);
  font-size: 40px;
  font-weight: 700;
  color: #ffbd0b;
  text-shadow: 0 3px 0 #cb7407;
  z-index: 3;
}

.ctq-coin__currency::after {
  content: "";
  position: absolute;
  height: 200px; width: 40px;
  margin: 20px -65px;
  box-shadow:
    50px -23px 0 -10px rgba(255,255,255,0.22),
    85px -10px 0 -16px rgba(255,255,255,0.19);
  transform: rotate(-50deg);
  animation: ctq-shine 1.5s infinite ease;
}

.ctq-coin__shapes {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  transform: rotate(-44deg);
}

.ctq-coin__shapes div {
  position: relative;
  width: 20px; height: 4px;
  background: #d57e08;
  border-top: 2px solid #c47207;
  margin: 75px 7px;
}

.ctq-coin__shapes div::before,
.ctq-coin__shapes div::after {
  content: "";
  position: absolute;
  width: 20px; height: 4px;
  background: #d57e08;
  border-top: 2px solid #c47207;
}

.ctq-coin__shapes div::before { margin: -10px 0; }
.ctq-coin__shapes div::after  { margin:   8px 0; }

.ctq-coin__shape_l { float: left; }
.ctq-coin__shape_r { float: right; }

.ctq-coin__top,
.ctq-coin__bottom {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 30px;
  font-weight: 700;
  color: #d67f08;
  white-space: nowrap;
}

.ctq-coin__top    { top: 12%; }
.ctq-coin__bottom { bottom: 12%; }

.ctq-coin__shadow {
  position: absolute;
  bottom: -50px; left: 0;
  width: 100%; height: 20px;
  background: rgba(0,0,0,0.4);
  border-radius: 50%;
  margin: 185px 7px 0 7px;
  z-index: -1;
  animation: ctq-swift 1.5s infinite ease;
}
</style>
