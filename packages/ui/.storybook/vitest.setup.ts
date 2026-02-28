import { setupProjectAnnotations } from '@storybook/vue3-vite'
import * as previewAnnotations from './preview'
import { beforeAll } from 'vitest'

// 设置 Storybook 项目注解，使测试能够访问 Storybook 配置
// 这对于使用 @storybook/addon-vitest 进行浏览器测试是必需的
export const projectAnnotations = setupProjectAnnotations([previewAnnotations])

// Vitest setup file for Storybook
beforeAll(() => {
  // 全局测试设置可以在这里添加
})
