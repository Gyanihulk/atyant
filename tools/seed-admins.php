<?php
declare(strict_types=1);
// Run locally only: php tools/seed-admins.php
// Creates/updates gatividyut-private/accounts.sqlite with 3 admin accounts.
// Never upload this script to public_html or the live server.

$private = dirname(__DIR__).'/gatividyut-private';
if (!is_dir($private) && !mkdir($private, 0700, true)) {
    fwrite(STDERR, "Cannot create $private\n");
    exit(1);
}

$db = new PDO('sqlite:'.$private.'/accounts.sqlite', null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);
$db->exec('PRAGMA busy_timeout=5000');
// Same schema as server/auth.php — keep these in sync.
$db->exec("CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY, employee TEXT UNIQUE NOT NULL, name TEXT NOT NULL, hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', admin INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");

function randomPassword(int $bytes = 12): string {
    // 12 random bytes -> 16 base64url chars; comfortably within the 12-72 byte password policy.
    return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '=');
}

// Placeholder identities — replace employee ID / name before real use if desired.
$admins = [
    ['employee' => 'ADMIN1', 'name' => 'Admin One'],
    ['employee' => 'ADMIN2', 'name' => 'Admin Two'],
    ['employee' => 'ADMIN3', 'name' => 'Admin Three'],
];

$insert = $db->prepare("INSERT INTO accounts(employee,name,hash,status,admin) VALUES (?,?,?,'approved',1)");
$existsCheck = $db->prepare('SELECT id FROM accounts WHERE employee=?');

echo "Seeded admin credentials (shown once — save them now):\n\n";
foreach ($admins as $admin) {
    $existsCheck->execute([$admin['employee']]);
    if ($existsCheck->fetch()) {
        echo "SKIPPED {$admin['employee']} — employee ID already exists in accounts.sqlite\n";
        continue;
    }
    $password = randomPassword();
    $insert->execute([$admin['employee'], $admin['name'], password_hash($password, PASSWORD_DEFAULT)]);
    printf("Employee ID: %-10s Name: %-14s Password: %s\n", $admin['employee'], $admin['name'], $password);
}

chmod($private.'/accounts.sqlite', 0600);
echo "\nDone. Upload gatividyut-private/accounts.sqlite to the server's gatividyut-private/ folder\n";
echo "(the sibling of public_html, not inside it). Change these passwords after first login\n";
echo "if the login page supports it, or re-run setup with new hashes.\n";
