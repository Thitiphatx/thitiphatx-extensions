"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mikudoujin = exports.MikudoujinInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const MikudoujinParser_1 = require("./MikudoujinParser");
const MD_DOMAIN = 'https://www.miku-doujin.com';
exports.MikudoujinInfo = {
    version: '1.0.2',
    name: 'Mikudoujin',
    icon: 'icon.png',
    author: 'Thitiphatx',
    authorWebsite: 'https://github.com/Thitiphatx',
    description: 'Extension that pulls comics from miku-doujin.com.',
    contentRating: paperback_extensions_common_1.ContentRating.MATURE,
    websiteBaseURL: MD_DOMAIN,
    sourceTags: [
        {
            text: '18+',
            type: paperback_extensions_common_1.TagType.RED,
        },
    ],
};
class Mikudoujin extends paperback_extensions_common_1.Source {
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
                            'referer': MD_DOMAIN,
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
    getMangaShareUrl(mangaId) { return `${MD_DOMAIN}/${mangaId}`; }
    async getMangaDetails(mangaId) {
        const request = createRequestObject({
            url: `${MD_DOMAIN}`,
            method: 'GET',
            param: `/${mangaId}/`,
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return (0, MikudoujinParser_1.parseMangaDetails)($, mangaId);
    }
    async getChapters(mangaId) {
        const request = createRequestObject({
            url: `${MD_DOMAIN}`,
            method: 'GET',
            param: `/${mangaId}/`,
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return (0, MikudoujinParser_1.parseChapters)($, mangaId);
    }
    async getChapterDetails(mangaId, chapterId) {
        if (chapterId != "null") {
            const request = createRequestObject({
                url: `${MD_DOMAIN}/${mangaId}/${chapterId}/`,
                method: 'GET',
            });
            const response = await this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            return (0, MikudoujinParser_1.parseChapterDetails)($, mangaId, chapterId);
        }
        else {
            const request = createRequestObject({
                url: `${MD_DOMAIN}/${mangaId}/`,
                method: 'GET',
            });
            const response = await this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            return (0, MikudoujinParser_1.parseChapterDetails)($, mangaId, chapterId);
        }
    }
    async filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) {
        let page = 1;
        let updatedManga = {
            ids: [],
            loadMore: true,
        };
        while (updatedManga.loadMore) {
            const request = createRequestObject({
                url: `${MD_DOMAIN}/?page=${page}`,
                method: 'GET',
            });
            page++;
            const response = await this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            updatedManga = (0, MikudoujinParser_1.parseUpdatedManga)($, time, ids);
            if (updatedManga.ids.length > 0) {
                mangaUpdatesFoundCallback(createMangaUpdates({
                    ids: updatedManga.ids,
                }));
            }
        }
    }
    async getHomePageSections(sectionCallback) {
        const request = createRequestObject({
            url: `${MD_DOMAIN}`,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        (0, MikudoujinParser_1.parseHomeSections)($, sectionCallback);
    }
    async getViewMoreItems(homepageSectionId, metadata) {
        const page = metadata?.page ?? 1;
        let param = '';
        switch (homepageSectionId) {
            case 'latest_doujin':
                param = `${page}`;
                break;
            default:
                throw new Error('Requested to getViewMoreItems for a section ID which doesn\'t exist');
        }
        const request = createRequestObject({
            url: `${MD_DOMAIN}/?page=`,
            method: 'GET',
            param,
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        const manga = (0, MikudoujinParser_1.parseViewMore)($);
        metadata = !(0, MikudoujinParser_1.isLastPage)($) ? { page: page + 1 } : {};
        return createPagedResults({
            results: manga,
            metadata,
        });
    }
    async getSearchResults(query, metadata) {
        const page = metadata?.page ?? 1;
        let request;
        if (query.title) {
            request = createRequestObject({
                url: `https://cse.google.com/cse?cx=009358231530793211456:xtfjzcegcz8&q=${encodeURI(query.title ?? '')}`,
                method: 'GET',
            });
        }
        else {
            request = createRequestObject({
                url: `https://miku-doujin.com/genre/${encodeURI(query?.includedTags?.map((x) => x.id)[0])}/?page=${page}`,
                method: 'GET',
            });
        }
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        const manga = (0, MikudoujinParser_1.parseSearch)($);
        metadata = !(0, MikudoujinParser_1.isLastPage)($) ? { page: page + 1 } : undefined;
        return createPagedResults({
            results: manga,
            metadata
        });
    }
    async getTags() {
        const request = createRequestObject({
            url: MD_DOMAIN,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return (0, MikudoujinParser_1.parseTags)($) || [];
    }
}
exports.Mikudoujin = Mikudoujin;
