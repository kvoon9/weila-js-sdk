# React 项目集成

## 安装

```bash
npm install weilasdk
# 或
pnpm add weilasdk
```

## 初始化 SDK

### 方式一：Context Provider（推荐）

创建 `src/contexts/WeilaContext.tsx`：

```tsx
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { WeilaCore, initLogger } from 'weilasdk';

interface WeilaContextType {
    weila: WeilaCore | null;
    isReady: boolean;
    isLoginReady: boolean;
}

const WeilaContext = createContext<WeilaContextType>({
    weila: null,
    isReady: false,
    isLoginReady: false
});

export function useWeila() {
    return useContext(WeilaContext);
}

interface WeilaProviderProps {
    children: React.ReactNode;
    wsUrl: string;
    appId: string;
    appKey: string;
}

export function WeilaProvider({ children, wsUrl, appId, appKey }: WeilaProviderProps) {
    const weilaRef = useRef<WeilaCore | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isLoginReady, setIsLoginReady] = useState(false);

    useEffect(() => {
        const init = async () => {
            const weila = new WeilaCore();
            
            // 保存引用
            weilaRef.current = weila;

            // 初始化日志
            initLogger('MOD:*, CORE:*, FSM:*, AUDIO:*, DB:*, NET:*');

            // 设置服务器
            weila.weila_setWebSock(wsUrl);
            weila.weila_setAuthInfo(appId, appKey);

            // 注册事件
            weila.weila_onEvent((eventId, data) => {
                console.log('[Weila]', eventId, data);
                
                if (eventId === 'WL_EXT_DATA_PREPARE_IND') {
                    if (data?.state === 'PREPARE_SUCC_END') {
                        setIsReady(true);
                    }
                }
            });

            // 初始化
            await weila.weila_init();
        };

        init();

        return () => {
            // 清理
            if (weilaRef.current) {
                weilaRef.current.weila_logout();
            }
        };
    }, [wsUrl, appId, appKey]);

    const value = {
        weila: weilaRef.current,
        isReady,
        isLoginReady
    };

    return (
        <WeilaContext.Provider value={value}>
            {children}
        </WeilaContext.Provider>
    );
}
```

### 方式二：Hook

创建 `src/hooks/useWeila.ts`：

```tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { WeilaCore, initLogger } from 'weilasdk';

interface UseWeilaOptions {
    wsUrl: string;
    appId: string;
    appKey: string;
}

export function useWeila({ wsUrl, appId, appKey }: UseWeilaOptions) {
    const weilaRef = useRef<WeilaCore | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [userInfo, setUserInfo] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            const weila = new WeilaCore();
            weilaRef.current = weila;

            initLogger('MOD:*, CORE:*, FSM:*, AUDIO:*, DB:*, NET:*');

            weila.weila_setWebSock(wsUrl);
            weila.weila_setAuthInfo(appId, appKey);

            weila.weila_onEvent((eventId, data) => {
                console.log('[Weila]', eventId, data);
                
                if (eventId === 'WL_EXT_DATA_PREPARE_IND' && data?.state === 'PREPARE_SUCC_END') {
                    setIsReady(true);
                }
            });

            await weila.weila_init();
        };

        init();
    }, [wsUrl, appId, appKey]);

    const login = useCallback(async (account: string, password: string, countryCode: string) => {
        if (!weilaRef.current) {
            throw new Error('Weila SDK 未初始化');
        }
        
        // 音频初始化必须在用户交互事件中
        await weilaRef.current.weila_audioInit();
        
        const user = await weilaRef.current.weila_login(account, password, countryCode);
        setUserInfo(user);
        return user;
    }, []);

    const logout = useCallback(async () => {
        if (weilaRef.current) {
            await weilaRef.current.weila_logout();
            setUserInfo(null);
        }
    }, []);

    return {
        weila: weilaRef.current,
        isReady,
        userInfo,
        login,
        logout
    };
}
```

## 使用示例

### App 入口

```tsx
// App.tsx
import React from 'react';
import { WeilaProvider } from './contexts/WeilaContext';
import Chat from './components/Chat';

function App() {
    return (
        <WeilaProvider
            wsUrl={process.env.REACT_APP_WS_URL!}
            appId={process.env.REACT_APP_ID!}
            appKey={process.env.REACT_APP_KEY!}
        >
            <Chat />
        </WeilaProvider>
    );
}

export default App;
```

### 登录组件

```tsx
// components/Login.tsx
import React from 'react';
import { useWeila } from '../contexts/WeilaContext';

export function Login() {
    const { isReady, login } = useWeila();
    const [account, setAccount] = React.useState('');
    const [password, setPassword] = React.useState('');

    const handleLogin = async () => {
        try {
            const user = await login(account, password, '86');
            console.log('登录成功', user);
        } catch (error) {
            console.error('登录失败', error);
        }
    };

    return (
        <div>
            <input
                value={account}
                onChange={e => setAccount(e.target.value)}
                placeholder="手机号"
            />
            <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="密码"
            />
            <button onClick={handleLogin} disabled={!isReady}>
                登录
            </button>
        </div>
    );
}
```

## 注意事项

### useRef 而非 useState

WeilaCore 实例不应使用 useState：

```tsx
// 错误 ❌
const [weila, setWeila] = useState<WeilaCore | null>(null);
// 这会导致无限渲染

// 正确 ✓
const weilaRef = useRef<WeilaCore | null>(null);
// 使用 useRef 避免 React 渲染问题
```

### 音频初始化时机

音频上下文必须在用户交互事件中初始化：

```tsx
// 错误 ❌
useEffect(() => {
    weila.weila_audioInit(); // 不在用户事件中调用
}, []);

// 正确 ✓
<button onClick={async () => {
    await weila.weila_audioInit(); // 在点击事件中调用
}}>登录</button>
```

### TypeScript 类型

如需完整类型支持，创建 `src/types/weila.d.ts`：

```typescript
import { WeilaCore } from 'weilasdk';

declare module 'weilasdk' {
    // 如果需要扩展类型
}
```
