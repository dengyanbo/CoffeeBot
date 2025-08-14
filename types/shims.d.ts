// Minimal ambient type declarations to satisfy the linter in environments
// without installed type packages. These should be superseded by real types
// when dependencies are installed locally.

declare module '@azure/functions' {
	export type HttpRequest = any;
	export type HttpResponseInit = any;
	export type InvocationContext = any;
	export const app: any;
}

declare module 'botbuilder' {
	export class ActivityHandler {}
	export class TeamsActivityHandler extends ActivityHandler {
		public onMessage(handler: any): void;
	}
	export const TurnContext: any;
	export const CardFactory: any;
	export const CloudAdapter: any;
	export const ConfigurationServiceClientCredentialFactory: any;
	export const createBotFrameworkAuthenticationFromConfiguration: any;
}

declare module '@azure/data-tables' {
	export class TableClient {
		static fromConnectionString(connectionString: string, tableName: string): TableClient;
		createTable(): Promise<void>;
		createEntity(entity: any): Promise<void>;
		listEntities(options?: any): AsyncIterable<any>;
	}
}

declare module 'dayjs' {
	const dayjs: any;
	export default dayjs;
}
declare module 'dayjs/plugin/utc' {
	const plugin: any;
	export default plugin;
}
declare module 'dayjs/plugin/timezone' {
	const plugin: any;
	export default plugin;
}

declare module 'fs' {
	const fsAny: any;
	export = fsAny;
}
declare module 'path' {
	const pathAny: any;
	export = pathAny;
}

// Node globals
declare const process: any;

