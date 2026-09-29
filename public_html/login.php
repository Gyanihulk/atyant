<?php
$v = @filemtime(__DIR__.'/login.css') ?: time();
echo str_replace('href="login.css"', 'href="login.css?v='.$v.'"', file_get_contents(__DIR__.'/login.html'));
