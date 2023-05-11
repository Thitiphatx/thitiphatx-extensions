"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Niceoppai = exports.NiceoppaiInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const NiceoppaiParser_1 = require("./NiceoppaiParser");
const NO_DOMAIN = 'https://www.niceoppai.net';
exports.NiceoppaiInfo = {
    version: '1.1.0',
    name: 'Niceoppai',
    icon: 'icon.png',
    author: 'Thitiphatx',
    authorWebsite: 'https://github.com/Thitiphatx',
    description: 'Extension that pulls comics from niceoppai.net',
    contentRating: paperback_extensions_common_1.ContentRating.MATURE,
    websiteBaseURL: NO_DOMAIN,
    sourceTags: [
        {
            text: 'Recommend',
            type: paperback_extensions_common_1.TagType.GREEN,
        },
    ],
};
class Niceoppai extends paperback_extensions_common_1.Source {
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
                            'referer': NO_DOMAIN,
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
    getMangaShareUrl(mangaId) { return `${NO_DOMAIN}/${mangaId}/`; }
    async getMangaDetails(mangaId) {
        const request = createRequestObject({
            url: `${NO_DOMAIN}`,
            method: 'GET',
            param: `/${mangaId}/`,
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return (0, NiceoppaiParser_1.parseMangaDetails)($, mangaId);
    }
    async getChapters(mangaId) {
        const request = createRequestObject({
            url: `${NO_DOMAIN}`,
            method: 'GET',
            param: `/${mangaId}/`,
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return (0, NiceoppaiParser_1.parseChapters)($, mangaId);
    }
    async getChapterDetails(mangaId, chapterId) {
        const request = createRequestObject({
            url: `${NO_DOMAIN}/${mangaId}/${chapterId}`,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return (0, NiceoppaiParser_1.parseChapterDetails)($, mangaId, chapterId);
    }
    async filterUpdatedManga(mangaUpdatesFoundCallback, time, ids) {
        let page = 1;
        let updatedManga = {
            ids: [],
            loadMore: true,
        };
        while (updatedManga.loadMore) {
            const request = createRequestObject({
                url: `${NO_DOMAIN}/?page=${page}`,
                method: 'GET',
            });
            page++;
            const response = await this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            updatedManga = (0, NiceoppaiParser_1.parseUpdatedManga)($, time, ids);
            if (updatedManga.ids.length > 0) {
                mangaUpdatesFoundCallback(createMangaUpdates({
                    ids: updatedManga.ids,
                }));
            }
        }
    }
    async getHomePageSections(sectionCallback) {
        const request = createRequestObject({
            url: `${NO_DOMAIN}/latest-chapters/1`,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        (0, NiceoppaiParser_1.parseHomeSections)($, sectionCallback);
    }
    async getViewMoreItems(homepageSectionId, metadata) {
        const page = metadata?.page ?? 1;
        let param = '';
        switch (homepageSectionId) {
            case 'latest_manga':
                param = `${page}`;
                break;
            default:
                throw new Error('Requested to getViewMoreItems for a section ID which doesn\'t exist');
        }
        const request = createRequestObject({
            url: `${NO_DOMAIN}/latest-chapters/`,
            method: 'GET',
            param,
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        const manga = (0, NiceoppaiParser_1.parseViewMore)($);
        metadata = !(0, NiceoppaiParser_1.isLastPage)($) ? { page: page + 1 } : {};
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
                url: `${encodeURI(query.title ?? '')}`,
                method: 'GET',
            });
            const response = await this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            let id = query.title.split('/')[3] ?? '';
            const manga = (0, NiceoppaiParser_1.parseSearch)($, id);
            return createPagedResults({
                results: manga,
            });
        }
        else {
            request = createRequestObject({
                url: `https://miku-doujin.com/genre/${encodeURI(query?.includedTags?.map((x) => x.id)[0])}/?page=${page}`,
                method: 'GET',
            });
            const response = await this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            if ($('#sub-navbar > div > nav > div > span:nth-child(3) > a > span').text() != '') {
                metadata = !(0, NiceoppaiParser_1.isLastPage)($) ? { page: page + 1 } : undefined;
                const manga = (0, NiceoppaiParser_1.parseSearchtag)($);
                return createPagedResults({
                    results: manga,
                    metadata
                });
            }
            else {
                request = createRequestObject({
                    url: `https://miku-doujin.com/artist/${encodeURI(query?.includedTags?.map((x) => x.id)[0])}/?page=${page}`,
                    method: 'GET',
                });
                const response = await this.requestManager.schedule(request, 1);
                const $ = this.cheerio.load(response.data);
                metadata = !(0, NiceoppaiParser_1.isLastPage)($) ? { page: page + 1 } : undefined;
                const manga = (0, NiceoppaiParser_1.parseSearchtag)($);
                return createPagedResults({
                    results: manga,
                    metadata
                });
            }
        }
    }
    async getTags() {
        const request = createRequestObject({
            url: NO_DOMAIN,
            method: 'GET',
        });
        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data);
        return (0, NiceoppaiParser_1.parseTags)($) || [];
    }
}
exports.Niceoppai = Niceoppai;
