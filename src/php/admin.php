<?php
session_start();

// Admin password hash – change this to your own password using password_hash('yourpassword', PASSWORD_DEFAULT)
define('ADMIN_PASSWORD_HASH', '$2y$10$3EovJLK0HIVeKIl.ECuNUuhiMU5PiEtdz1odHcomITw3NpZux4NMi'); // default: admin123

$error = '';
$action = isset($_POST['action']) ? $_POST['action'] : '';

// CSRF token helpers
function generateCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken(string $token): bool {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// Handle login
if ($action === 'login') {
    $password = $_POST['password'] ?? '';
    if (password_verify($password, ADMIN_PASSWORD_HASH)) {
        $_SESSION['admin_logged_in'] = true;
        header('Location: admin.php');
        exit;
    } else {
        $error = 'Nepareiza parole.';
    }
}

// Handle logout
if ($action === 'logout') {
    $_SESSION['admin_logged_in'] = false;
    session_destroy();
    header('Location: admin.php');
    exit;
}

// Require login for all admin actions
$loggedIn = !empty($_SESSION['admin_logged_in']);

if ($loggedIn) {
    $csrfToken = generateCsrfToken();

    // Handle leaderboard clear
    if ($action === 'clear' && verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        $type = $_POST['type'] ?? '';
        if ($type === 'single') {
            file_put_contents(__DIR__ . '/../data/leaderboard.txt', '');
        } elseif ($type === 'teams') {
            file_put_contents(__DIR__ . '/../data/teams_leaderboard.txt', '');
        }
        header('Location: admin.php');
        exit;
    }

    // Handle delete single entry
    if ($action === 'delete' && verifyCsrfToken($_POST['csrf_token'] ?? '')) {
        $type  = $_POST['type']  ?? '';
        $index = isset($_POST['index']) ? (int)$_POST['index'] : -1;
        $file  = $type === 'teams'
            ? __DIR__ . '/../data/teams_leaderboard.txt'
            : __DIR__ . '/../data/leaderboard.txt';
        if (file_exists($file) && $index >= 0) {
            $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if (isset($lines[$index])) {
                unset($lines[$index]);
                file_put_contents($file, implode("\n", $lines) . (count($lines) > 0 ? "\n" : ''), LOCK_EX);
            }
        }
        header('Location: admin.php');
        exit;
    }
}

// Load leaderboard data for display
function loadLeaderboard(string $file): array {
    if (!file_exists($file)) return [];
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $results = [];
    foreach ($lines as $i => $line) {
        $parts = explode('|', $line);
        if (count($parts) >= 3) {
            $results[] = [
                'index' => $i,
                'name'  => htmlspecialchars(trim($parts[0]), ENT_QUOTES, 'UTF-8'),
                'score' => (int)$parts[1],
                'time'  => htmlspecialchars(trim($parts[2]), ENT_QUOTES, 'UTF-8'),
            ];
        }
    }
    return $results;
}

$singleData = $loggedIn ? loadLeaderboard(__DIR__ . '/../data/leaderboard.txt') : [];
$teamsData  = $loggedIn ? loadLeaderboard(__DIR__ . '/../data/teams_leaderboard.txt') : [];
$csrfToken  = $loggedIn ? generateCsrfToken() : '';
?>
<!DOCTYPE html>
<html lang="lv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panelis – Liepājas Ekskursija</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../../style.css">
    <style>
        body { overflow: auto; font-family: 'Poppins', sans-serif; }
        .admin-wrap {
            position: relative; z-index: 1;
            max-width: 900px; margin: 0 auto; padding: 30px 20px;
        }
        .admin-card {
            background: rgba(30, 10, 10, 0.85);
            border: 2px solid rgba(255,170,0,0.35);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 4px 30px rgba(0,0,0,0.5);
        }
        .admin-card h2 {
            color: #ffaa00;
            margin-bottom: 20px;
        }
        .admin-title {
            font-size: 38px;
            color: #ffaa00;
            text-align: center;
            margin-bottom: 30px;
            text-shadow: 0 0 20px rgba(255,170,0,0.4);
        }
        .lb-table {
            width: 100%;
            border-collapse: collapse;
            color: #ccc;
            font-size: 14px;
        }
        .lb-table th {
            background: rgba(255,170,0,0.15);
            color: #ffaa00;
            padding: 10px 12px;
            text-align: left;
            border-bottom: 2px solid rgba(255,170,0,0.3);
        }
        .lb-table td {
            padding: 8px 12px;
            border-bottom: 1px solid rgba(255,255,255,0.07);
            vertical-align: middle;
        }
        .lb-table tr:hover td { background: rgba(255,170,0,0.05); }
        .btn-del {
            background: transparent;
            border: 1px solid #cc3333;
            color: #cc3333;
            border-radius: 6px;
            padding: 3px 10px;
            font-size: 12px;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s;
        }
        .btn-del:hover { background: #cc3333; color: #fff; }
        .btn-danger {
            background: transparent;
            border: 2px solid #cc3333;
            color: #cc3333;
            border-radius: 8px;
            padding: 8px 20px;
            font-size: 14px;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s;
            font-weight: bold;
        }
        .btn-danger:hover { background: #cc3333; color: #fff; }
        .input-field-admin {
            background: rgba(255,255,255,0.08);
            border: 2px solid rgba(255,170,0,0.3);
            border-radius: 8px;
            color: #fff;
            padding: 10px 14px;
            font-size: 15px;
            font-family: inherit;
            width: 100%;
            margin-bottom: 15px;
            outline: none;
        }
        .input-field-admin:focus { border-color: #ffaa00; }
        .btn-login {
            background: #ffaa00;
            border: none;
            color: #2a1a1a;
            border-radius: 8px;
            padding: 10px 30px;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
            font-family: inherit;
            transition: opacity 0.2s;
            width: 100%;
        }
        .btn-login:hover { opacity: 0.85; }
        .error-msg { color: #ff5555; margin-bottom: 15px; font-size: 14px; }
        .badge-count {
            background: rgba(255,170,0,0.2);
            color: #ffaa00;
            border-radius: 12px;
            padding: 2px 10px;
            font-size: 13px;
            margin-left: 8px;
        }
        .nav-back {
            display: inline-block;
            color: #ffaa00;
            text-decoration: none;
            font-size: 14px;
            margin-bottom: 20px;
            opacity: 0.8;
            transition: opacity 0.2s;
        }
        .nav-back:hover { opacity: 1; color: #ffaa00; }
        .logout-btn {
            background: transparent;
            border: 1px solid rgba(255,170,0,0.4);
            color: #ffaa00;
            border-radius: 8px;
            padding: 6px 18px;
            font-size: 13px;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s;
            float: right;
        }
        .logout-btn:hover { background: rgba(255,170,0,0.1); }
        .empty-msg { color: #888; text-align: center; padding: 20px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="wrap" id="bg-wrap"></div>
    <div class="admin-wrap">

<?php if (!$loggedIn): ?>
        <!-- Login form -->
        <h1 class="admin-title">🔐 Admin Panelis</h1>
        <div class="admin-card" style="max-width:400px; margin:0 auto;">
            <h2 style="text-align:center;">Pieslēgties</h2>
            <?php if ($error): ?>
                <p class="error-msg"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
            <?php endif; ?>
            <form method="POST" action="admin.php">
                <input type="hidden" name="action" value="login">
                <input type="password" name="password" class="input-field-admin" placeholder="Parole" autofocus required>
                <button type="submit" class="btn-login">Ienākt</button>
            </form>
            <div style="margin-top:15px; text-align:center;">
                <a href="../../index.html" class="nav-back">← Atpakaļ uz spēli</a>
            </div>
        </div>

<?php else: ?>
        <!-- Admin panel -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <a href="../../index.html" class="nav-back">← Atpakaļ uz spēli</a>
            <form method="POST" action="admin.php" style="display:inline;">
                <input type="hidden" name="action" value="logout">
                <button type="submit" class="logout-btn">Iziet</button>
            </form>
        </div>

        <h1 class="admin-title">⚙️ Admin Panelis</h1>

        <!-- Single player leaderboard -->
        <div class="admin-card">
            <h2>👤 Viens spēlētājs
                <span class="badge-count"><?php echo count($singleData); ?> ieraksti</span>
            </h2>
            <?php if (empty($singleData)): ?>
                <p class="empty-msg">Nav ierakstu.</p>
            <?php else: ?>
                <table class="lb-table">
                    <thead>
                        <tr><th>#</th><th>Vārds</th><th>Punkti</th><th>Laiks</th><th>Dzēst</th></tr>
                    </thead>
                    <tbody>
                        <?php foreach ($singleData as $i => $row): ?>
                        <tr>
                            <td><?php echo $i + 1; ?></td>
                            <td><?php echo $row['name']; ?></td>
                            <td><?php echo $row['score']; ?></td>
                            <td><?php echo $row['time']; ?></td>
                            <td>
                                <form method="POST" action="admin.php" onsubmit="return confirm('Dzēst šo ierakstu?');">
                                    <input type="hidden" name="action" value="delete">
                                    <input type="hidden" name="type" value="single">
                                    <input type="hidden" name="index" value="<?php echo $row['index']; ?>">
                                    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8'); ?>">
                                    <button type="submit" class="btn-del">Dzēst</button>
                                </form>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
            <div style="margin-top:16px;">
                <form method="POST" action="admin.php" onsubmit="return confirm('Vai tiešām notīrīt visu vienspēlētāja tabulu?');">
                    <input type="hidden" name="action" value="clear">
                    <input type="hidden" name="type" value="single">
                    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8'); ?>">
                    <button type="submit" class="btn-danger">🗑 Notīrīt visu tabulu</button>
                </form>
            </div>
        </div>

        <!-- Teams leaderboard -->
        <div class="admin-card">
            <h2>👥 Komandas
                <span class="badge-count"><?php echo count($teamsData); ?> ieraksti</span>
            </h2>
            <?php if (empty($teamsData)): ?>
                <p class="empty-msg">Nav ierakstu.</p>
            <?php else: ?>
                <table class="lb-table">
                    <thead>
                        <tr><th>#</th><th>Vārds</th><th>Punkti</th><th>Laiks</th><th>Dzēst</th></tr>
                    </thead>
                    <tbody>
                        <?php foreach ($teamsData as $i => $row): ?>
                        <tr>
                            <td><?php echo $i + 1; ?></td>
                            <td><?php echo $row['name']; ?></td>
                            <td><?php echo $row['score']; ?></td>
                            <td><?php echo $row['time']; ?></td>
                            <td>
                                <form method="POST" action="admin.php" onsubmit="return confirm('Dzēst šo ierakstu?');">
                                    <input type="hidden" name="action" value="delete">
                                    <input type="hidden" name="type" value="teams">
                                    <input type="hidden" name="index" value="<?php echo $row['index']; ?>">
                                    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8'); ?>">
                                    <button type="submit" class="btn-del">Dzēst</button>
                                </form>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
            <div style="margin-top:16px;">
                <form method="POST" action="admin.php" onsubmit="return confirm('Vai tiešām notīrīt visu komandu tabulu?');">
                    <input type="hidden" name="action" value="clear">
                    <input type="hidden" name="type" value="teams">
                    <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($csrfToken, ENT_QUOTES, 'UTF-8'); ?>">
                    <button type="submit" class="btn-danger">🗑 Notīrīt visu tabulu</button>
                </form>
            </div>
        </div>

<?php endif; ?>
    </div>
    <script src="../../src/js/script.js?v=20260216194225" defer></script>
</body>
</html>
