<?php
require __DIR__.'/server/auth.php';
requireUser();
readfile(__DIR__.'/index.html');
echo '<script src="account-session.js"></script>';
