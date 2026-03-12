const gameCanvas = document.getElementById('gameCanvas');
const gameCtx = gameCanvas.getContext('2d');
const uiCanvas = document.getElementById('uiCanvas');
const uiCtx = uiCanvas.getContext('2d');

const GameState = Object.freeze({
    MENU: 'MENU',      // 新增
    PLAYING: 'PLAYING',
    WIN: 'WIN',
    GAME_OVER: 'GAME_OVER'
});
let currentGameState = GameState.MENU; // 初始状态改为菜单
let isGameRunning;

// ---- drawing ----
let GAME_AREA_WIDTH = gameCanvas.height;
let GAME_AREA_HEIGHT = gameCanvas.height;

// 移除固定的 gridSize 和 tileCount 定義
// 修改為根據關卡動態計算
const MIN_GRID_SIZE = 20; // 最小網格尺寸，確保貪吃蛇清晰可見
const BASE_CANVAS_SIZE = 400; // 基礎畫布尺寸

let gridSize = 20; // 设置一个合理的初始值，将在resetGame中被覆盖
let tileCount = 20;

let baseSpeed = 200;
let speedMultiplyFactor = 5;


let level = 0;
let winCounts = 5;
let snake;
let direction = { x: 0, y: 0 };
let food = { x: 0, y: 0 }; // 初始化为一个坐标，将被覆盖
let score = 0;
let totalScore = 0;

// --- 新增：输入缓冲队列 ---
let inputBuffer = []; // 用于存储方向指令的队列，如 'up', 'down', 'left', 'right'
const INPUT_BUFFER_MAX_LENGTH = 3; // 缓冲队列的最大长度，防止无限积压
let lastUpdateTime = 0;

function gameLoop(timeStamp) {

    requestAnimationFrame(gameLoop);
    if (timeStamp - lastUpdateTime >= Math.max(50, baseSpeed - speedMultiplyFactor * score)) {
        update();
        lastUpdateTime = timeStamp;
    }
    draw();
    // setTimeout(gameLoop, curSpeed);
}

function update() {

    // 修改判断条件
    if (currentGameState !== GameState.PLAYING) {
        return;
    }

    if (score >= winCounts) {
        currentGameState = GameState.WIN; // 使用枚举赋值
        isGameRunning = false;           // 2. 停止游戏计时
        return;
    }


    consumeInputBuffer();

    // if ((nextDirection.x !== 0 || nextDirection.y !== 0) && 
    //     !(nextDirection.x === -direction.x && nextDirection.y === -direction.y)) {
    //     direction = { x: nextDirection.x, y: nextDirection.y };
    // }

    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const segments = snake.slice(1)
    // print(segments)

    // 检查是否撞墙或撞到自己
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount || segments.some(segment => segment.x === head.x && segment.y === head.y)) {
        currentGameState = GameState.GAME_OVER; // 使用枚举赋值
        // alert('游戏结束！得分: ' + score);
        // resetGame();
        return;
    }

    snake.unshift(head);

    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        score++;
        totalScore++;
        food = generateAvoidPositions(snake);
    } else {
        snake.pop();
    }

}

// --- 新增：消费输入缓冲队列的函数 ---
function consumeInputBuffer() {
    // 循环尝试处理缓冲队列中的指令，直到找到一个可执行的，或者队列为空
    while (inputBuffer.length > 0) {
        // 从队列头部获取下一个缓冲的指令
        const nextInput = inputBuffer.shift(); // shift() 移除并返回数组的第一个元素

        // 根据指令计算目标方向向量
        let targetDir = { x: 0, y: 0 };
        switch (nextInput) {
            case 'up': targetDir = { x: 0, y: -1 }; break;
            case 'down': targetDir = { x: 0, y: 1 }; break;
            case 'left': targetDir = { x: -1, y: 0 }; break;
            case 'right': targetDir = { x: 1, y: 0 }; break;
        }

        // 安全检查：防止立即反向移动（自杀）
        // 只有当目标方向不与当前方向完全相反时，才应用这个缓冲输入
        if (!(targetDir.x === -direction.x && targetDir.y === -direction.y)) {
            direction = targetDir;
            break; // 成功应用一个输入，跳出循环
        }
        // 如果当前缓冲的输入是“反向指令”，则丢弃它，继续检查队列中的下一个输入
    }
}


function formatTimer(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function draw() {
    drawGame(gameCtx, gameCanvas);
    drawUI(uiCtx, uiCanvas);
}

function drawGame(ctx, canvas) {

    // 1. 清空整个画布
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    // === 开始菜单界面 ===
    if (currentGameState === GameState.MENU) {
        // 清空画布，使用有质感的深色背景
        ctx.fillStyle = '#0d1b2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // ---- 1. 绘制主标题 ----
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // 主标题
        ctx.fillText('贪吃蛇', canvas.width / 2, canvas.height * 0.18);
        // 副标题/装饰
        ctx.font = '20px Arial';
        ctx.fillStyle = '#e0e1dd';
        ctx.fillText('Classic Snake Game', canvas.width / 2, canvas.height * 0.18 + 40);

        // ---- 2. 绘制游戏规则板块 (左侧) ----
        const panelWidth = canvas.width * 0.7; // 规则板块占70%宽度
        const panelX = (canvas.width - panelWidth) / 2;
        const rulesYStart = canvas.height * 0.3;

        //預留給logo
        // logo板块背景
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(panelX, rulesYStart, panelWidth, canvas.height * 0.5);

        //
        // ---- 3. 绘制开始提示 (在底部) ----
        ctx.fillStyle = '#f72585';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('按 [回 车 键] 开 始 游 戏', canvas.width / 2, canvas.height * 0.88);

        // ---- 4. 绘制版本或装饰信息 ----
        ctx.fillStyle = '#6a6970';
        ctx.font = '14px Arial';
        ctx.fillText('使用输入缓冲队列 | 画面动态增长', canvas.width / 2, canvas.height * 0.95);

        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
        return; // 菜单状态下不绘制蛇和食物
    }

    // snake draw
    snake.forEach((segment, index) => {

        if (index == 0) {
            console.log(segment)
            drawHead(gameCtx, segment)
        } else {
            ctx.fillStyle = 'lime';
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize);
        }
    });

    // food draw
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);

    // --- 修改：勝利與失敗界面的遮罩和文字也需動態適應 ---
    if (currentGameState === GameState.WIN || currentGameState === GameState.GAME_OVER) {
        // 半透明黑色遮罩，始終覆蓋整個當前畫布
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 根據狀態決定文字顏色
        const isWin = currentGameState === GameState.WIN;
        ctx.fillStyle = isWin ? 'gold' : 'red';

        // 動態計算字體大小
        const mainFontSize = Math.max(30, canvas.width / 12);
        const subFontSize = Math.max(16, canvas.width / 25);

        ctx.font = `bold ${mainFontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 繪製主標題（“勝利!”或“遊戲結束!”）
        ctx.fillText(isWin ? '勝利!' : '遊戲結束!', canvas.width / 2, canvas.height / 2 - 40);

        // 繪製關卡和得分信息
        ctx.font = `${subFontSize}px Arial`;
        const infoText = isWin ? `關卡: ${level} 得分: ${score}` : `關卡: ${level} 最終得分: ${score}`;
        ctx.fillText(infoText, canvas.width / 2, canvas.height / 2);

        // 繪製操作提示
        const hintText = isWin ?
            (level < 5 ? '按 [Enter] 进入下一关' : '按 [Enter] 返回菜单') :
            '按 [Enter] 返回菜单';
        ctx.fillText(hintText, canvas.width / 2, canvas.height / 2 + 40);

        // 重置文本對齊方式
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
        return; // 繪製完菜單後直接返回，避免執行後面的“遊戲中”繪製邏輯
    }
}



function drawHead(ctx, head) {

    const headX = head.x * gridSize;
    const headY = head.y * gridSize;

    // 確保貪吃蛇頭部始終是明顯的綠色
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(headX, headY, gridSize, gridSize);

    // 繪製眼睛，確保在不同gridSize下都能清晰可見
    ctx.fillStyle = 'red';
    const eyeSize = Math.max(4, gridSize / 6); // 確保眼睛最小為4像素

    let leftEyeX, leftEyeY, rightEyeX, rightEyeY;

    if (direction.x === 0) {
        leftEyeX = headX + gridSize * 0.25;
        rightEyeX = headX + gridSize * 0.75 - eyeSize;

        if (direction.y > 0) { // 向下
            leftEyeY = rightEyeY = headY + gridSize * 0.75 - eyeSize;
        } else { // 向上
            leftEyeY = rightEyeY = headY + gridSize * 0.25;
        }
    } else if (direction.y === 0) {
        leftEyeY = headY + gridSize * 0.25;
        rightEyeY = headY + gridSize * 0.75 - eyeSize;

        if (direction.x > 0) { // 向右
            leftEyeX = rightEyeX = headX + gridSize * 0.75 - eyeSize;
        } else { // 向左
            leftEyeX = rightEyeX = headX + gridSize * 0.25;
        }
    } else {
        // 如果方向為(0,0)（初始狀態），默認繪製向前看的眼睛
        leftEyeX = headX + gridSize * 0.25;
        rightEyeX = headX + gridSize * 0.75 - eyeSize;
        leftEyeY = rightEyeY = headY + gridSize * 0.25;
    }

    // 繪製眼睛
    if (gridSize >= 8) { // 只有當網格足夠大時才繪製眼睛
        ctx.fillRect(leftEyeX, leftEyeY, eyeSize, eyeSize);
        ctx.fillRect(rightEyeX, rightEyeY, eyeSize, eyeSize);
    }

}
function drawUI(ctx, canvas) {
    // 1. 始终用深色清除背景
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (currentGameState == GameState.PLAYING) {

        // 2. 绘制计分板标题区域
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, 30);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏状态', canvas.width / 2, 22);

        // 3. 绘制游戏数据
        ctx.textAlign = 'left';
        ctx.font = '16px Arial';
        ctx.fillStyle = '#eee';

        const lineHeight = 26;
        const startX = 15;
        // 从标题下方开始绘制
        let currentY = 55;

        // 数据行列表
        // 注意：在 MENU 状态下，这些值就是脚本开头定义的初始值（如 level:1, score:0）
        const dataLines = [
            `当前关卡: ${level}`,
            `本关得分: ${score}`,
            `目标食物: ${winCounts}`,
            `游戏时间: ${formatTimer(isGameRunning ? performance.now() - gameStartTime : 0)}`,
            `累计总分: ${totalScore}`,
            // `场地大小: ${tileCount}×${tileCount}`,
        ];

        dataLines.forEach((line) => {
            // 简单检查，防止绘制到画布外
            if (currentY < canvas.height - 10) {
                ctx.fillText(line, startX, currentY);
                currentY += lineHeight;
            }
        });

    }
    // 4. 如果是菜单状态，可以在计分板底部添加一个友好的提示
    if (currentGameState === GameState.MENU) {
        ctx.fillStyle = '#4cc9f0';
        ctx.font = 'italic 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('↓ 规则在下边', canvas.width / 2, canvas.height - 20);
        ctx.textAlign = 'start';
    }
    // 恢复默认填充色
    ctx.fillStyle = 'white';
}

function randomPosition() {
    return { x: Math.floor(Math.random() * tileCount), y: Math.floor(Math.random() * tileCount) }
}

function generateAvoidPositions(snake = []) {
    let result = randomPosition();
    while (snake.some(segment => segment.x === result.x && segment.y === result.y)) {
        result = randomPosition();
    }
    return result;
}

function resetGame(new_level = 1) {
    // 重置狀態
    currentGameState = GameState.PLAYING;
    level = new_level;

    // 計算動態的網格尺寸和畫布尺寸
    // 保持每個網格的最小尺寸，隨著關卡提升增加網格數量
    const gridCount = 20 + (level - 1) * 5; // 每關增加5個網格
    const canvasSize = Math.max(BASE_CANVAS_SIZE, gridCount * MIN_GRID_SIZE);

    // 重新計算實際的網格尺寸，使其能均勻分佈在畫布中
    gridSize = Math.floor(canvasSize / gridCount);
    tileCount = gridCount;
    winCounts = 5 + (level - 1) * 2; // 每關增加2個目標食物

    // 動態調整畫布尺寸
    gameCanvas.width = canvasSize;
    gameCanvas.height = canvasSize;
    uiCanvas.height = canvasSize; // 保持UI畫布高度與遊戲畫布一致

    // 更新遊戲區域常量
    GAME_AREA_WIDTH = canvasSize;
    GAME_AREA_HEIGHT = canvasSize;

    score = 0;
    totalScore = (new_level != 1) ? totalScore : 0;

    // 調整遊戲速度，隨著關卡提升，蛇移動更快
    baseSpeed = Math.max(50, 300 - (level - 1) * 30);
    speedMultiplyFactor = 5 + level;

    // 初始化蛇的位置在畫布中心
    const centerX = Math.floor(tileCount / 2);
    const centerY = Math.floor(tileCount / 2);
    snake = [{ x: centerX, y: centerY }];
    direction = { x: 0, y: 0 };

    inputBuffer = [];
    gameStartTime = performance.now();
    isGameRunning = true;

    food = generateAvoidPositions(snake);
}

document.addEventListener('keydown', event => {
    // 菜单和胜利状态下的回车键逻辑保持不变
    if (currentGameState === GameState.MENU && event.key === 'Enter') {
        resetGame(1);
        return;
    }
    if (currentGameState === GameState.WIN && event.key === 'Enter') {
        if (level < 5) {
            resetGame(++level);
        } else {
            console.log("跳转到排行榜");
        }
        return;
    }
    // --- 新增：游戏结束状态下的回车键逻辑 ---
    if (currentGameState === GameState.GAME_OVER && event.key === 'Enter') {
        // 返回开始菜单
        currentGameState = GameState.MENU;
        // 可选：在此处可以重置一些临时的游戏状态变量，但注意不要调用 resetGame，因为它会开始新游戏。
        // 例如，可以清空蛇和方向，避免菜单界面还显示着上一局的内容。
        snake = [];
        direction = { x: 0, y: 0 };
        inputBuffer = [];
        score = 0; // 将当前关卡得分清零
        isGameRunning = false; // 确保计时停止
        return;
    }
    // --- 修改：非游玩状态不处理方向键 ---
    if (currentGameState !== GameState.PLAYING) return;

    let inputCommand = null;
    // 将按键映射为指令字符串
    switch (event.key) {
        case 'ArrowUp': inputCommand = 'up'; break;
        case 'ArrowDown': inputCommand = 'down'; break;
        case 'ArrowLeft': inputCommand = 'left'; break;
        case 'ArrowRight': inputCommand = 'right'; break;
    }

    // 如果按下了有效的方向键
    if (inputCommand) {
        // 阻止该按键的默认行为（即页面滚动）
        event.preventDefault();
        // 防止连续按同一个键导致队列重复填充（可选优化，但通常不影响）
        if (inputBuffer.length > 0 && inputBuffer[inputBuffer.length - 1] === inputCommand) {
            return;
        }
        // 将指令加入缓冲队列尾部
        if (inputBuffer.length < INPUT_BUFFER_MAX_LENGTH) {
            inputBuffer.push(inputCommand);
        }
        // 也可以选择不限制长度，但限制长度能让操作感觉更“新鲜”
    }
});

// resetGame();
requestAnimationFrame(gameLoop);