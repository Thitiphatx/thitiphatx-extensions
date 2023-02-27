"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nekopost = exports.NekopostInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const NekopostParser_1 = require("./NekopostParser");
const NP_DOMAIN = 'https://www.nekopost.net';
exports.NekopostInfo = {
    version: '1.0.0',
    name: 'Nekopost',
    icon: 'icon.png',
    author: 'Thitiphatx',
    authorWebsite: 'https://github.com/Thitiphatx',
    description: 'Extension that pulls comics from Nekopost.net.',
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
        const $ = this.cheerio.load(response.data);
        return (0, NekopostParser_1.parseChapters)($, mangaId);
    }
    async getChapterDetails(mangaId, chapterId) {
        const request = createRequestObject({
            url: `${NP_DOMAIN}/manga/${mangaId}/${chapterId}`,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return (0, NekopostParser_1.parseChapterDetails)($, mangaId, chapterId);
    }
    async filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) {
        let page = 1;
        let updatedManga = {
            ids: [],
            loadMore: true,
        };
        while (updatedManga.loadMore) {
            const request = createRequestObject({
                url: `https://api.osemocphoto.com/frontAPI/getLatestChapter/m/0/${page += 12}`,
                method: 'GET',
            });
            const response = await this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            updatedManga = (0, NekopostParser_1.parseUpdatedManga)($, time, ids);
            if (updatedManga.ids.length > 0) {
                mangaUpdatesFoundCallback(createMangaUpdates({
                    ids: updatedManga.ids,
                }));
            }
        }
    }
    async getHomePageSections(sectionCallback) {
        const request = createRequestObject({
            url: `https://api.osemocphoto.com/frontAPI/getLatestChapter/m/0/`,
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
        const page = metadata?.page ?? 12;
        let param = '';
        switch (homepageSectionId) {
            case 'latest_comic':
                param = `${page}`;
                break;
            default:
                throw new Error('Requested to getViewMoreItems for a section ID which doesn\'t exist');
        }
        const request = createRequestObject({
            url: `https://api.osemocphoto.com/frontAPI/getLatestChapter/m/0/${page}`,
            method: 'GET',
            param,
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        const manga = (0, NekopostParser_1.parseViewMore)($);
        metadata = !(0, NekopostParser_1.isLastPage)($) ? { page: page + 12 } : {};
        return createPagedResults({
            results: manga,
            metadata,
        });
    }
    async getSearchResults(query) {
        const request = createRequestObject({
            url: `${NP_DOMAIN}/manga_list/search/${encodeURI(query.title ?? '')}`,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        const manga = (0, NekopostParser_1.parseSearch)($);
        return createPagedResults({
            results: manga,
        });
    }
}
exports.Nekopost = Nekopost;
