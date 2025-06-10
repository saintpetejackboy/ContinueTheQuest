<?php
require_once __DIR__ . '/../../includes/auth.php';
session_start();
logoutUser();
header('Location: /?page=home');
