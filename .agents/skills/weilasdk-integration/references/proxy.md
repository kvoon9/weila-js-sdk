# 代理配置

开发环境需要配置代理以访问微喇服务器。

## 开发服务器代理

### Vue (vue.config.js)

```javascript
module.exports = {
    devServer: {
        proxy: {
            '/v1': {
                target: 'http://webapi.weila.hk:8080/',
                changeOrigin: true,
                secure: false
            },
            '/audio': {
                target: 'https://weilaaudio.oss-cn-shenzhen.aliyuncs.com',
                changeOrigin: true,
                secure: true
            },
            '/avatar': {
                target: 'https://weilaavatar.oss-cn-shenzhen.aliyuncs.com',
                changeOrigin: true,
                secure: true
            },
            '/ptt': {
                target: 'https://weilaspeech.oss-cn-shenzhen.aliyuncs.com',
                changeOrigin: true,
                secure: true
            }
        }
    }
};
```

### Webpack 5 (webpack.config.js)

```javascript
module.exports = {
    devServer: {
        proxy: {
            '/v1': {
                target: 'http://webapi.weila.hk:8080/',
                changeOrigin: true,
                secure: false,
                ws: true
            },
            '/audio': {
                target: 'https://weilaaudio.oss-cn-shenzhen.aliyuncs.com',
                changeOrigin: true,
                secure: true
            },
            '/avatar': {
                target: 'https://weilaavatar.oss-cn-shenzhen.aliyuncs.com',
                changeOrigin: true,
                secure: true
            },
            '/ptt': {
                target: 'https://weilaspeech.oss-cn-shenzhen.aliyuncs.com',
                changeOrigin: true,
                secure: true
            }
        }
    }
};
```

### Vite (vite.config.ts)

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    server: {
        proxy: {
            '/v1': {
                target: 'http://webapi.weila.hk:8080/',
                changeOrigin: true,
                secure: false,
                ws: true
            },
            '/audio': {
                target: 'https://weilaaudio.oss-cn-shenzhen.aliyuncs.com',
                changeOrigin: true,
                secure: true
            },
            '/avatar': {
                target: 'https://weilaavatar.oss-cn-shenzhen.aliyuncs.com',
                changeOrigin: true,
                secure: true
            },
            '/ptt': {
                target: 'https://weilaspeech.oss-cn-shenzhen.aliyuncs.com',
                changeOrigin: true,
                secure: true
            }
        }
    }
});
```

### UniApp (uni.config.js)

```javascript
module.exports = {
    devServer: {
        https: false,
        proxy: {
            '/v1': {
                target: 'http://webapi.weila.hk:8080/',
                changeOrigin: true,
                secure: false,
                ws: true
            },
            '/audio': {
                target: 'https://weilaaudio.oss-cn-shenzhen.aliyuncs.com',
                changeOrigin: true,
                secure: true
            },
            '/avatar': {
                target: 'https://weilaavatar.oss-cn-shenzhen.aliyuncs.com',
                changeOrigin: true,
                secure: true
            },
            '/ptt': {
                target: 'https://weilaspeech.oss-cn-shenzhen.aliyuncs.com',
                changeOrigin: true,
                secure: true
            }
        }
    }
};
```

## 服务器端点说明

| 路径 | 用途 | 目标服务器 |
|------|------|-----------|
| `/v1` | API 请求 | http://webapi.weila.hk:8080/ |
| `/audio` | 音频文件 | https://weilaaudio.oss-cn-shenzhen.aliyuncs.com |
| `/avatar` | 头像图片 | https://weilaavatar.oss-cn-shenzhen.aliyuncs.com |
| `/ptt` | PTT 语音 | https://weilaspeech.oss-cn-shenzhen.aliyuncs.com |

## 生产环境

生产环境通常直接使用域名，不需要代理。确保：

1. 域名已备案
2. HTTPS 证书有效
3. CORS 配置正确
