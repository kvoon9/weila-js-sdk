

function getDevelopeProxy(): any {
	return {
		'/v1': {
			// 8080是测试服, 没有8080是正式服
			target: process.env.NODE_ENV === 'production' ? "http://webapi.weila.hk/" : "http://webapi.weila.hk:8080/",
			secure: false,
			changeOrigin: true,
			pathRewrite: {
				'^/v1': '/v1',
			},
		},

		// '/audio': {
		// 	target: 'https://weilaaudio.oss-cn-shenzhen.aliyuncs.com',
		// 	secure: false,
		// 	changeOrigin: true,
		// 	pathRewrite: {
		// 		'^/audio': '',
		// 	},
		// },

		'https://weilacache.oss-cn-shenzhen.aliyuncs.com': {
			target: 'https://weilacache.oss-cn-shenzhen.aliyuncs.com',
			secure: false,
			changeOrigin: true,
			pathRewrite: {
				'^https://weilacache.oss-cn-shenzhen.aliyuncs.com': '',
			},
		},

		'http://weilaavatar.oss-cn-shenzhen.aliyuncs.com': {
			target: 'https://weilaavatar.oss-cn-shenzhen.aliyuncs.com',
			secure: false,
			changeOrigin: true,
			pathRewrite: {
				'^https://weilaavatar.oss-cn-shenzhen.aliyuncs.com': '',
			},
		},

		'/avatar': {
			target: 'https://weilaavatar.oss-cn-shenzhen.aliyuncs.com',
			secure: false,
			changeOrigin: true,
			pathRewrite: {
				'^/avatar': '/avatar',
			},
		},

		'/ptt': {
			target: 'https://weilaspeech.oss-cn-shenzhen.aliyuncs.com',
			secure: false,
			changeOrigin: true,
			pathRewrite: {
				'^/ptt': '/ptt',
			},
		},
	}
}

module.exports = {
	getDevelopeProxy: getDevelopeProxy
}
