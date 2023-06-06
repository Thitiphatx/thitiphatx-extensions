"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mikudoujin = exports.MikudoujinInfo = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const MikudoujinParser_1 = require("./MikudoujinParser");
const MD_DOMAIN = 'https://www.miku-doujin.com';
exports.MikudoujinInfo = {
    version: '1.0.5',
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
        // Recent update
        const request1 = createRequestObject({
            url: `${MD_DOMAIN}`,
            method: 'GET',
        });
        const response1 = await this.requestManager.schedule(request1, 1);
        const $1 = this.cheerio.load(response1.data);
        (0, MikudoujinParser_1.parseHomeSections)($1, sectionCallback);
        // Random
        const request2 = createRequestObject({
            url: `${MD_DOMAIN}/e9l99/`,
            method: 'GET',
        });
        const response2 = await this.requestManager.schedule(request2, 1);
        const $2 = this.cheerio.load(response2.data);
        (0, MikudoujinParser_1.parseRandomSections)($2, sectionCallback);
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
                url: `${encodeURI(query.title ?? '')}`,
                method: 'GET',
            });
            const response = await this.requestManager.schedule(request, 1);
            const $ = this.cheerio.load(response.data);
            let id = query.title.split('/')[3] ?? '';
            const manga = (0, MikudoujinParser_1.parseSearch)($, id);
            return createPagedResults({
                results: manga,
            });
        }
        else {
            if ((query?.includedTags?.map((x) => x.label)[0]).includes('เรื่อง')) {
                request = createRequestObject({
                    url: `${MD_DOMAIN}/story/${encodeURI(query?.includedTags?.map((x) => x.id)[0])}/?page=${page}`,
                    method: 'GET',
                });
                const response = await this.requestManager.schedule(request, 1);
                const $ = this.cheerio.load(response.data);
                metadata = !(0, MikudoujinParser_1.isLastPage)($) ? { page: page + 1 } : undefined;
                const manga = (0, MikudoujinParser_1.parseSearchtag)($);
                return createPagedResults({
                    results: manga,
                    metadata,
                });
            }
            else {
                request = createRequestObject({
                    url: `${MD_DOMAIN}/artist/${encodeURI(query?.includedTags?.map((x) => x.id)[0])}/?page=${page}`,
                    method: 'GET',
                });
                const response = await this.requestManager.schedule(request, 1);
                const $ = this.cheerio.load(response.data);
                if ($('#sub-navbar > div > nav > div > span:nth-child(3) > a > span').text() != '') {
                    metadata = !(0, MikudoujinParser_1.isLastPage)($) ? { page: page + 1 } : undefined;
                    const manga = (0, MikudoujinParser_1.parseSearchtag)($);
                    return createPagedResults({
                        results: manga,
                        metadata
                    });
                }
                else {
                    request = createRequestObject({
                        url: `https://miku-doujin.com/genre/${encodeURI(query?.includedTags?.map((x) => x.id)[0])}/?page=${page}`,
                        method: 'GET',
                    });
                    const response = await this.requestManager.schedule(request, 1);
                    const $ = this.cheerio.load(response.data);
                    metadata = !(0, MikudoujinParser_1.isLastPage)($) ? { page: page + 1 } : undefined;
                    const manga = (0, MikudoujinParser_1.parseSearchtag)($);
                    return createPagedResults({
                        results: manga,
                        metadata
                    });
                }
            }
        }
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
