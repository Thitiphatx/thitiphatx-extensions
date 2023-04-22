"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nekopost = exports.NekopostInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const NekopostParser_1 = require("./NekopostParser");
const NP_DOMAIN = 'https://www.nekopost.net';
exports.NekopostInfo = {
    version: '1.0.4',
    name: 'Nekopost',
    icon: 'icon.png',
    author: 'Thitiphatx',
    authorWebsite: 'https://github.com/Thitiphatx',
    description: 'Extension that pulls comics from Nekopost.net',
    contentRating: paperback_extensions_common_1.ContentRating.MATURE,
    websiteBaseURL: NP_DOMAIN,
    sourceTags: [
        {
            text: 'Recommend',
            type: paperback_extensions_common_1.TagType.GREEN,
        },
    ],
};
class Nekopost extends paperback_extensions_common_1.Source {
    constructor() {
        super(...arguments);
        this.requestManager = createRequestManager({
            requestsPerSecond: 4,
            requestTimeout: 15000,
            interceptor: {
                interceptRequest: async (request) => {
                    request.headers = {
                        ...(request.headers ?? {}),
                        ...{
                            'referer': NP_DOMAIN,
                        },
                    };
                    return request;
                },
                interceptResponse: async (response) => {
                    return response;
                },
            },
        });
    }
    getMangaShareUrl(mangaId) { return `${NP_DOMAIN}/manga/${mangaId}`; }
    async getMangaDetails(mangaId) {
        const request = createRequestObject({
            url: `https://api.osemocphoto.com/frontAPI/getProjectInfo/`,
            method: 'GET',
            param: mangaId,
        });
        const response = await this.requestManager.schedule(request, 1);
        let data;
        try {
            data = JSON.parse(response.data);
        }
        catch (e) {
            throw new Error(`${e}`);
        }
        return (0, NekopostParser_1.parseMangaDetails)(data, mangaId);
    }
    async getChapters(mangaId) {
        const request = createRequestObject({
            url: `https://api.osemocphoto.com/frontAPI/getProjectInfo/`,
            method: 'GET',
            param: mangaId,
        });
        const response = await this.requestManager.schedule(request, 1);
        let data;
        try {
            data = JSON.parse(response.data);
        }
        catch (e) {
            throw new Error(`${e}`);
        }
        return (0, NekopostParser_1.parseChapters)(data, mangaId);
    }
    async getChapterDetails(mangaId, chapterId) {
        const request = createRequestObject({
            url: `https://www.osemocphoto.com/collectManga/${mangaId}/${chapterId}/${mangaId}_${chapterId}.json`,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        let data;
        try {
            data = JSON.parse(response.data);
        }
        catch (e) {
            throw new Error(`${e}`);
        }
        return (0, NekopostParser_1.parseChapterDetails)(data, mangaId, chapterId);
    }
    async filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) {
        let page = 0;
        let updatedManga = {
            ids: [],
            loadMore: true,
        };
        while (updatedManga.loadMore) {
            const request = createRequestObject({
                url: `https://api.osemocphoto.com/frontAPI/getLatestChapterF3/m/0/12/${page}`,
                method: 'GET',
            });
            page++;
            const response = await this.requestManager.schedule(request, 1);
            let data;
            try {
                data = JSON.parse(response.data);
            }
            catch (e) {
                throw new Error(`${e}`);
            }
            updatedManga = (0, NekopostParser_1.parseUpdatedManga)(data, time, ids);
            if (updatedManga.ids.length > 0) {
                mangaUpdatesFoundCallback(createMangaUpdates({
                    ids: updatedManga.ids,
                }));
            }
        }
    }
    async getHomePageSections(sectionCallback) {
        const request = createRequestObject({
            url: 'https://api.osemocphoto.com/frontAPI/getLatestChapterF3/m/0/12/0',
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        let data;
        try {
            data = JSON.parse(response.data);
        }
        catch (e) {
            throw new Error(`${e}`);
        }
        (0, NekopostParser_1.parseHomeSections)(data, sectionCallback);
    }
    async getViewMoreItems(homepageSectionId, metadata) {
        const page = metadata?.page ?? 0;
        let param = '';
        switch (homepageSectionId) {
            case 'latest_comic':
                param = `${page}`;
                break;
            default:
                throw new Error('Requested to getViewMoreItems for a section ID which doesn\'t exist');
        }
        const request = createRequestObject({
            url: `https://api.osemocphoto.com/frontAPI/getLatestChapterF3/m/0/12/`,
            method: 'GET',
            param,
        });
        const response = await this.requestManager.schedule(request, 1);
        let data;
        try {
            data = JSON.parse(response.data);
        }
        catch (e) {
            throw new Error(`${e}`);
        }
        const manga = (0, NekopostParser_1.parseViewMore)(data);
        metadata = data ? { page: page + 12 } : {};
        return createPagedResults({
            results: manga,
            metadata,
        });
    }
    async getSearchResults(query) {
        if (query.title) {
            const request = createRequestObject({
                url: 'https://api.osemocphoto.com/frontAPI/getProjectSearch',
                method: 'POST',
                data: JSON.stringify({
                    ipKeyword: `${(query.title ?? '')}`,
                }),
            });
            const response = await this.requestManager.schedule(request, 1);
            let data;
            try {
                data = JSON.parse(response.data);
            }
            catch (e) {
                throw new Error(`${e}`);
            }
            const manga = (0, NekopostParser_1.parseSearch)(data);
            return createPagedResults({
                results: manga,
            });
        }
        else {
            const request = createRequestObject({
                url: `https://api.osemocphoto.com/frontAPI/getProjectExplore/${query?.includedTags?.map((x) => x.id)[0]}/n/1/S/`,
                method: 'POST',
            });
            const response = await this.requestManager.schedule(request, 1);
            let data;
            try {
                data = JSON.parse(response.data);
            }
            catch (e) {
                throw new Error(`${e}`);
            }
            const manga = (0, NekopostParser_1.parseSearch)(data);
            return createPagedResults({
                results: manga,
            });
        }
    }
    async getTags() {
        const arrayTags = [];
        const TagList = JSON.parse('{"List":[{"id":"1","label":"Fantasy"},{"id":"2","label":"Action"},{"id":"3","label":"Drama"},{"id":"5","label":"Sport"},{"id":"7","label":"Sci-fi"},{"id":"8","label":"Comedy"},{"id":"9","label":"Slice of Life"},{"id":"10","label":"Romance"},{"id":"13","label":"Adventure"},{"id":"23","label":"Yaoi"},{"id":"49","label":"Seinen"},{"id":"25","label":"Trap"},{"id":"26","label":"Gender Blender"},{"id":"45","label":"Second Life"},{"id":"44","label":"Isekai"},{"id":"43","label":"School Life"},{"id":"32","label":"Mystery"},{"id":"48","label":"One Shot"},{"id":"47","label":"Horror"},{"id":"37","label":"Doujinshi"},{"id":"46","label":"Shounen"},{"id":"42","label":"Shoujo"},{"id":"24","label":"Yuri"},{"id":"41","label":"Gourmet"},{"id":"50","label":"Harem"},{"id":"51","label":"Reincanate"}]}');
        for (const tag of TagList.List) {
            const id = tag.id ?? '';
            const label = tag.label ?? '';
            if (!id || !label)
                continue;
            arrayTags.push({ id: id, label: label });
        }
        const tagSections = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })];
        return tagSections || [];
    }
}
exports.Nekopost = Nekopost;
