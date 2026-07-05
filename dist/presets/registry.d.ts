export interface RemoteSpec {
    owner: string;
    repo: string;
    ref: string;
    subpath: string;
}
export declare function parseRemoteSpec(specifier: string): RemoteSpec;
export declare function fetchPreset(spec: RemoteSpec, force?: boolean): Promise<string>;
//# sourceMappingURL=registry.d.ts.map