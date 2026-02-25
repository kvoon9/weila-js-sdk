### Monorepo Structure Learned
- Uses pnpm workspaces with 'packages/*' and 'playgrounds/*'
- Root scripts provide shortcuts for building core and running the vue3 playground
- Workspace dependencies use the 'workspace:*' protocol
- TS config is shared via tsconfig.base.json
- Root .npmrc handles hoisting and peer dependency strictness
