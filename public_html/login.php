<?php
$v = @filemtime(__DIR__.'/login.css') ?: time();
echo preg_replace('/href="login\.css(?:\?[^"\r\n]*)?"/', 'href="login.css?v='.$v.'"', file_get_contents(__DIR__.'/login.html'));
