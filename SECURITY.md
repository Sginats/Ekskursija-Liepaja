# Security Implementation

## File Access Protection

This application now includes multiple layers of security to protect sensitive files and prevent unauthorized access.

### 1. Root Directory Protection (/.htaccess)

**Protections:**
- **Directory Listing Disabled**: Users cannot browse directory contents
- **Data File Protection**: Direct access to .txt, .json, and .log files is denied
- **Security Headers**: 
  - X-Frame-Options: SAMEORIGIN (prevents clickjacking)
  - X-XSS-Protection: Enabled (prevents XSS attacks)
  - X-Content-Type-Options: nosniff (prevents MIME type sniffing)

**What's Protected:**
- All .txt files (leaderboard data, mini-game scores)
- All .json files (lobby data, configuration files)
- All .log files

### 2. Data Directory Protection (/src/data/.htaccess)

**Protections:**
- **Complete Access Denial**: All files in src/data/ are blocked from direct browser access
- **PHP Access Allowed**: PHP scripts can still read/write these files internally

**What's Protected:**
- leaderboard.txt
- lobbies.json
- mini_lb_*.txt files

**Testing:**
```
❌ BLOCKED: https://yoursite.com/src/data/leaderboard.txt
❌ BLOCKED: https://yoursite.com/src/data/lobbies.json
✅ ALLOWED: PHP scripts reading/writing these files
```

### 3. PHP Backend Protection (/src/php/.htaccess)

**Protections:**
- **Security Headers**: Same as root, plus CORS headers
- **Data File Protection**: Blocks any .txt/.json files in this directory

**What's Protected:**
- PHP backend files have security headers applied
- CORS is properly configured for AJAX requests

### 4. Server-Side Validation

**Score Validation (save_score.php):**
- Maximum score: 100 (10 questions × 10 points)
- Minimum score: -50 (worst possible score)
- Name sanitization: Only alphanumeric + Latvian characters
- Name length: Maximum 8 characters

**Time Validation (mini_backend.php):**
- Minimum time: 0.01 seconds
- Maximum time: 300 seconds (5 minutes)

**Lobby Code Validation (lobby.php):**
- Only numeric characters allowed
- Must be exactly 4 digits

### 5. Client-Side Validation (Defense in Depth)

**Input Length Limits:**
- Player name: 8 characters (maxlength attribute)
- Join code: 8 characters (maxlength attribute)
- Quiz answers: 50 characters (maxlength attribute)

**Score Validation:**
- Client-side clamping before submission
- Prevents basic console manipulation from reaching server

## How Users Are Protected

### Before Implementation:
```javascript
// Console cheating was possible:
score = 9999;  // ❌ Would be saved to leaderboard

// Direct file access was possible:
https://yoursite.com/src/data/leaderboard.txt  // ❌ Could view all scores
```

### After Implementation:
```javascript
// Console manipulation is caught:
score = 9999;  
// Client-side: Clamped to 100 before submission
// Server-side: Validated again, clamped to 100
// Result: Maximum score of 100 saved ✅

// Direct file access is blocked:
https://yoursite.com/src/data/leaderboard.txt
// Result: 403 Forbidden ✅
```

## Testing File Protection

To verify protection is working:

1. **Test Directory Listing:**
   ```
   https://yoursite.com/src/data/
   Expected: 403 Forbidden (no file listing)
   ```

2. **Test Data File Access:**
   ```
   https://yoursite.com/src/data/leaderboard.txt
   Expected: 403 Forbidden
   ```

3. **Test Application Still Works:**
   ```
   Play game → Submit score → Check leaderboard
   Expected: Score appears in leaderboard ✅
   ```

## Additional Security Recommendations

For production deployment, consider:

1. **HTTPS**: Enable SSL/TLS certificates
2. **Rate Limiting**: Limit API requests per IP
3. **Input Sanitization**: Already implemented, but review regularly
4. **Session Management**: Add session tokens for multiplayer
5. **Database**: Consider moving from flat files to SQL with prepared statements
6. **WAF**: Use a Web Application Firewall for additional protection

## File Structure

```
/
├── .htaccess                    # Root protection
├── public/                      # Public HTML/CSS
│   ├── index.html
│   ├── map.html
│   └── style.css
├── src/
│   ├── data/                    # Protected data files
│   │   ├── .htaccess           # Data protection
│   │   ├── leaderboard.txt
│   │   ├── lobbies.json
│   │   └── mini_lb_*.txt
│   ├── php/                     # Backend scripts
│   │   ├── .htaccess           # PHP security headers
│   │   ├── save_score.php
│   │   ├── mini_backend.php
│   │   ├── lobby.php
│   │   ├── leaderboard.php
│   │   └── translate.php
│   └── js/
│       └── script.js
└── assets/                      # Images and sounds
```
