"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.versionSetsFromProto = versionSetsFromProto;
function versionSetsFromProto(resp) {
    if (resp == null || resp.majorVersionSets == null || resp.majorVersionSets.length === 0) {
        throw new Error('Must be constructed from a compatability response with at least one version set');
    }
    return {
        versionSets: resp.majorVersionSets.map((set) => versionSetFromProto(set)),
        get defaultSet() {
            return this.versionSets[this.versionSets.length - 1];
        },
        get defaultBuildId() {
            return this.defaultSet.default;
        },
    };
}
function versionSetFromProto(set) {
    if (set == null || set.buildIds == null || set.buildIds.length === 0) {
        throw new Error('Compatible version sets must contain at least one Build Id');
    }
    return {
        buildIds: set.buildIds,
        default: set.buildIds[set.buildIds.length - 1],
    };
}
//# sourceMappingURL=build-id-types.js.map