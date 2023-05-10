"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSearch = exports.parseViewMore = exports.parseHomeSections = exports.parseUpdatedManga = exports.parseChapterDetails = exports.parseChapters = exports.parseMangaDetails = void 0;
const paperback_extensions_common_1 = require("paperback-extensions-common");
const entities = require("entities");
const parseMangaDetails = (data, mangaId) => {
    let hentai = false;
    const manga = data;
    const titles = [];
    // const relate: string[] = []
    const id = manga.projectInfo.projectId ?? '';
    const projectName = manga.projectInfo.projectName ?? '';
    const alias = manga.projectInfo.aliasName ?? '';
    // relate.push('9130')
    let imageVersion = manga.projectInfo.imageVersion ?? '';
    let image = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? 'https://www.nekopost.net/assets/demo/no_image.jpg';
    const author = manga.projectInfo.authorName ?? '';
    const artist = manga.projectInfo.artistName ?? '';
    const info = manga.projectInfo.info ?? '';
    const view = Number(manga.projectInfo.views) ?? 0;
    titles.push(projectName);
    titles.push(alias);
    if (manga.projectInfo.flgMature || manga.projectInfo.flgGlue || manga.projectInfo.flgIntense || manga.projectInfo.flgReligion || manga.projectInfo.flgViolent)
        hentai = true;
    const arrayTags = [];
    for (const tag of manga?.listCate) {
        const label = tag.cateName ?? '';
        const id = tag.cateCode ?? '';
        if (!id || !label)
            continue;
        if (manga.projectInfo.flgMature)
            hentai = true;
        arrayTags.push({ id: id, label: label });
    }
    const tagSections = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })];
    const rawStatus = manga.projectInfo.status ?? '';
    let status = paperback_extensions_common_1.MangaStatus.ONGOING;
    if (rawStatus == '0')
        status = paperback_extensions_common_1.MangaStatus.COMPLETED;
    return createManga({
        id: mangaId,
        titles: titles,
        image: image,
        hentai: hentai,
        status: status,
        author: author,
        artist: artist,
        tags: tagSections,
        // relatedIds: relate,
        desc: info,
        views: view,
    });
};
exports.parseMangaDetails = parseMangaDetails;
const parseChapters = (data, mangaId) => {
    const chapters = [];
    let i = 0;
    for (const chapter of data.listChapter) {
        i++;
        const title = chapter.chapterName ?? '';
        const chapterId = chapter.chapterId ?? '';
        if (!chapterId)
            continue;
        const chapNum = Number(chapter.chapterNo); //We're manually setting the chapters regarless, however usually the ID equals the chapter number.
        const date = new Date(chapter.publishDate);
        if (!chapterId || !title)
            continue;
        chapters.push({
            id: chapterId,
            mangaId,
            name: decodeHTMLEntity(title),
            langCode: paperback_extensions_common_1.LanguageCode.THAI,
            chapNum: isNaN(chapNum) ? i : chapNum,
            time: date,
        });
        i--;
    }
    return chapters.map(chapter => {
        return createChapter(chapter);
    });
};
exports.parseChapters = parseChapters;
const parseChapterDetails = (data, mangaId, chapterId) => {
    const pages = [];
    for (const images of data.pageItem) {
        let imageFile = (images.pageName) ? `${images.pageName}` : `${images.fileName}`;
        let image = `https://www.osemocphoto.com/collectManga/${mangaId}/${chapterId}/${imageFile}`;
        if (image)
            pages.push(image);
    }
    const chapterDetails = createChapterDetails({
        id: chapterId,
        mangaId,
        pages: pages,
        longStrip: false,
    });
    return chapterDetails;
};
exports.parseChapterDetails = parseChapterDetails;
const parseUpdatedManga = (data, time, ids) => {
    const updatedManga = [];
    let loadMore = true;
    for (const manga of data?.listChapter) {
        const id = manga.projectId ?? '';
        const date = manga.createDate;
        const mangaDate = new Date(date);
        if (!id || !mangaDate)
            continue;
        if (mangaDate > time) {
            if (ids.includes(id)) {
                updatedManga.push(id);
            }
        }
        else {
            loadMore = false;
        }
    }
    return {
        ids: updatedManga,
        loadMore,
    };
};
exports.parseUpdatedManga = parseUpdatedManga;
const parseHomeSections = (data, sectionCallback) => {
    const latestSection = createHomeSection({ id: 'latest_comic', title: 'Latest Mangas', view_more: true });
    const latestSection_Array = [];
    for (const manga of data?.listChapter) {
        const id = manga.projectId ?? '';
        let imageVersion = manga.imageVersion ?? '';
        let image = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? 'https://www.nekopost.net/assets/demo/no_image.jpg';
        const title = manga.projectName ?? '';
        const subtitle = `Ch.${manga.chapterNo} ${manga.chapterName}` ?? '';
        if (!id || !title)
            continue;
        latestSection_Array.push(createMangaTile({
            id: id,
            image: image,
            title: createIconText({ text: decodeHTMLEntity(title) }),
            subtitleText: createIconText({ text: subtitle }),
        }));
    }
    latestSection.items = latestSection_Array;
    sectionCallback(latestSection);
};
exports.parseHomeSections = parseHomeSections;
const parseViewMore = (data) => {
    const comics = [];
    const collectedIds = [];
    for (const manga of data?.listChapter) {
        const id = manga.projectId ?? '';
        let imageVersion = manga.imageVersion ?? '';
        let image = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? 'https://www.nekopost.net/assets/demo/no_image.jpg';
        const title = manga.projectName ?? '';
        const subtitle = `Ch.${manga.chapterNo} ${manga.chapterName}` ?? '';
        if (!id || !title)
            continue;
        if (collectedIds.includes(id))
            continue;
        comics.push(createMangaTile({
            id,
            image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
            title: createIconText({ text: decodeHTMLEntity(title) }),
            subtitleText: createIconText({ text: subtitle }),
        }));
        collectedIds.push(id);
    }
    return comics;
};
exports.parseViewMore = parseViewMore;
const parseSearch = (data) => {
    const mangaItems = [];
    const collectedIds = [];
    if (data.listProject != null) {
        for (const manga of data.listProject) {
            const id = manga.projectId ?? '';
            let imageVersion = manga.imageVersion ?? '';
            let image = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? 'https://www.nekopost.net/assets/demo/no_image.jpg';
            const title = manga.projectName ?? '';
            const subtitle = `Ch.${manga.noChapter}` ?? '';
            if (!id || !title || !image)
                continue;
            if (collectedIds.includes(id))
                continue;
            mangaItems.push(createMangaTile({
                id,
                image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
                title: createIconText({ text: title }),
                subtitleText: createIconText({ text: subtitle }),
            }));
            collectedIds.push(id);
        }
    }
    return mangaItems;
};
exports.parseSearch = parseSearch;
const decodeHTMLEntity = (str) => {
    return entities.decodeHTML(str);
};
