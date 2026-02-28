# Test Checklist - Liepājas Ekskursija

## Pre-Deployment QA Validation

### Single Player Flow

#### Main Menu
- [ ] Page loads without console errors
- [ ] All buttons are clickable and responsive
- [ ] Audio settings work correctly
- [ ] Theme switching works
- [ ] Animation toggle works
- [ ] "Par spēli" modal opens and displays correctly
- [ ] "Iestatījumi" modal opens and works correctly

#### Game Start
- [ ] Can enter player name (max 8 chars)
- [ ] "Spēlēt vienam" navigates to map.html
- [ ] Name is passed correctly via URL parameter

#### Map Screen
- [ ] Map loads without console errors
- [ ] All 10 location points are visible
- [ ] Point tooltips show on hover
- [ ] Score display shows "Punkti: 0" initially
- [ ] Progression order is enforced (can only click active point)
- [ ] Before-game modal shows on first visit

#### Mini-Games (Each Location)

##### 1. Ziemeļu mols (Mols) - Fishing Game
- [ ] Game initializes correctly
- [ ] Instructions are clear
- [ ] SPACE key or button press works
- [ ] Tension bar responds to input
- [ ] Win condition works (catch fish)
- [ ] Lose condition works (line breaks)
- [ ] Points are awarded correctly
- [ ] Can retry on failure
- [ ] Continue advances progression

##### 2. Liepājas Teātris (Teatris) - History Sequence
- [ ] Events display in random order
- [ ] Can reorder events by clicking
- [ ] Correct order awards points
- [ ] Wrong order shows correct answer
- [ ] Can retry on failure
- [ ] Facts display after completion

##### 3. Tirdzniecības kanāls (Kanals) - Boat Dodge
- [ ] Canvas renders correctly
- [ ] Arrow keys / A-D / touch buttons work
- [ ] Obstacles spawn and move
- [ ] Collision detection works
- [ ] Win condition (8 dodges) works
- [ ] Lose condition (3 hits) works
- [ ] Timer counts down correctly

##### 4. Lielais Dzintars (Dzintars) - Simon Says
- [ ] Color grid displays correctly
- [ ] Sequence plays with visual feedback
- [ ] User can click colors
- [ ] Correct sequence advances rounds
- [ ] Wrong color shows feedback
- [ ] 3 rounds complete successfully

##### 5. RTU Liepāja (RTU) - Tower Blocks
- [ ] Phaser game initializes
- [ ] Start button works
- [ ] SPACE or click drops blocks
- [ ] Blocks stack correctly
- [ ] Perfect placement detection works
- [ ] Game over on miss works
- [ ] Continue button enables at milestone
- [ ] Points calculated correctly

##### 6. Liepājas Osta (Osta) - Boat Race
- [ ] Instructions display correctly
- [ ] SPACE or tap button works
- [ ] Press counter increments
- [ ] Timer tracks elapsed time
- [ ] Points awarded based on time
- [ ] 10 presses required to complete

##### 7. LSEZ - Cargo Sort
- [ ] Items display with correct colors
- [ ] Timer bar counts down
- [ ] Can click correct bin
- [ ] Score tracks correctly
- [ ] Win at 7+ correct sorts
- [ ] Lose if < 7 correct

##### 8. Karostas cietums (Cietums) - Guard Escape
- [ ] Guard patrol animation works
- [ ] Safe zone marked clearly
- [ ] SPACE or button moves player
- [ ] 5 steps required to win
- [ ] Wrong timing penalizes
- [ ] Speed increases with progress

##### 9. Ezerkrasta taka (Ezerkrasts) - Bird Spotting
- [ ] Birds spawn at intervals
- [ ] Birds fly away after timeout
- [ ] Clicking bird counts as caught
- [ ] 8 birds required to win
- [ ] Timer counts down from 22s

##### 10. Jūrmalas parks (Parks) - Memory Cards
- [ ] 4x2 grid displays correctly
- [ ] Cards flip on click
- [ ] Matching pairs stay revealed
- [ ] Non-matching cards flip back
- [ ] Win when all pairs found
- [ ] Points based on move count

#### Final Test
- [ ] Triggers after all 10 locations
- [ ] 10 questions display in Kahoot style
- [ ] Answer options are clickable
- [ ] Correct/incorrect feedback shows
- [ ] Score tracks correctly (+1 per correct)
- [ ] Results screen shows summary
- [ ] Can review answers

#### End Game
- [ ] Medal awarded correctly (Gold/Silver/Bronze)
- [ ] Final score displays correctly
- [ ] Time displays correctly
- [ ] "Saglabāt" saves to leaderboard
- [ ] "Atpakaļ uz menu" works
- [ ] "Spēlēt vēlreiz" works

### Multiplayer Flow

#### Lobby Creation
- [ ] "Spēlēt ar drauku" creates lobby
- [ ] 4-digit code generates
- [ ] Code displays clearly
- [ ] Waiting message shows

#### Joining Lobby
- [ ] Can enter 4-digit code
- [ ] "Pievienoties" validates code
- [ ] Error shows for invalid code
- [ ] Success navigates to map

#### Ready System
- [ ] "Esmu gatavs!" button works
- [ ] Both players must be ready
- [ ] Game starts when both ready
- [ ] Roles assigned (host/guest)

#### Synchronized Play
- [ ] Both players see same state
- [ ] Progress syncs between players
- [ ] Mini-games work in co-op mode
- [ ] Quiz shows for both players

### Leaderboard

#### Display
- [ ] Loads without errors
- [ ] Single player tab shows data
- [ ] Teams tab shows data
- [ ] Sorting by time works
- [ ] Sorting by score works
- [ ] Sorting by combo works
- [ ] Top 10 entries display

#### Data Integrity
- [ ] Names are sanitized
- [ ] Scores are accurate
- [ ] Times format correctly
- [ ] New entries save correctly

### Technical Requirements

#### Console Errors
- [ ] Zero console errors on load
- [ ] Zero console errors during gameplay
- [ ] No 404 errors for assets
- [ ] No JavaScript exceptions

#### Responsive Design
- [ ] Works on 320px+ width
- [ ] Works on 1920px+ width
- [ ] Touch controls work on mobile
- [ ] Keyboard controls work on desktop

#### Performance
- [ ] Page loads under 3 seconds
- [ ] Animations run at 60fps
- [ ] No memory leaks during play
- [ ] Audio plays without delay

#### Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browsers

### Security

#### Anti-Cheat
- [ ] Score validation works
- [ ] Session tokens validated
- [ ] Minimum time enforced (30s)
- [ ] Task completion verified

#### Data Sanitization
- [ ] Player names sanitized
- [ ] No XSS vulnerabilities
- [ ] No SQL injection (file-based)

## Known Issues Fixed

1. ✅ `startRTUTowerGame is not defined` - Fixed by adding missing `_showMilestonePrompt` method
2. ✅ `updateMapState null reference` - Fixed by adding defensive checks for onclick attribute parsing
3. ✅ Missing null checks - Added throughout codebase

## Deployment Checklist

- [ ] All files uploaded to server
- [ ] PHP files have correct permissions (644)
- [ ] Data folder is writable (666)
- [ ] .htaccess configured correctly
- [ ] HTTPS enabled (recommended)
- [ ] Cache-busting version parameters updated
- [ ] Test on production environment
- [ ] Verify leaderboard file paths

---

**Last Updated:** 2026-02-28  
**Version:** 1.0.0
