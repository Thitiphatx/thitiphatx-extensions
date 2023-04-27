import {
    Chapter,
    ChapterDetails,
    Tag,
    HomeSection,
    LanguageCode,
    Manga,
    MangaStatus,
    MangaTile,
    TagSection,
} from 'paperback-extensions-common'

import {
    MangaDetails,
    HomeData,
    ChapterImage,
    SearchData,
} from './NekopostHelper'

import entities = require('entities')

export const parseMangaDetails = (data: MangaDetails, mangaId: string): Manga => {
    let hentai = false
    const manga = data
    const titles: string[] = []
    
    const relate: string[] = []

    const id: string = manga.projectInfo.projectId ?? ''
    const projectName: string = manga.projectInfo.projectName ?? ''
    const alias: string = manga.projectInfo.aliasName ?? ''
    relate.push('9130')
    let imageVersion: string = manga.projectInfo.imageVersion ?? ''

    let image: string = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? 'https://www.nekopost.net/assets/demo/no_image.jpg'

    const author: string = manga.projectInfo.authorName ?? ''
    const artist: string = manga.projectInfo.artistName ?? ''
    const info: string = manga.projectInfo.info ?? ''
    const view: number = Number(manga.projectInfo.views) ?? 0

    titles.push(projectName)
    titles.push(alias)

    if (manga.projectInfo.flgMature || manga.projectInfo.flgGlue || manga.projectInfo.flgIntense || manga.projectInfo.flgReligion || manga.projectInfo.flgViolent) hentai = true
    
    const arrayTags: Tag[] = []
    for (const tag of manga?.listCate) {
        const label: string = tag.cateName ?? ''
        const id: string = tag.cateCode ?? ''

        if (!id || !label) continue
        if (manga.projectInfo.flgMature) hentai = true
        arrayTags.push({ id: id, label: label })
    }
    
    const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })]

    const rawStatus: string = manga.projectInfo.status ?? ''
    let status = MangaStatus.ONGOING
    if (rawStatus == '0') status = MangaStatus.COMPLETED
    return createManga({
        id: mangaId,
        titles: titles,
        image: image,
        hentai: hentai,
        status: status,
        author: author,
        artist: artist,
        tags: tagSections,
        relatedIds: relate,
        desc: info,
        views: view,
    })
}

export const parseChapters = (data: MangaDetails, mangaId: string): Chapter[] => {
    const chapters: Chapter[] = []
    let i = 0

    for (const chapter of data.listChapter) {
        i++
        const title: string = chapter.chapterName ?? ''
        const chapterId: string = chapter.chapterId ?? ''

        if (!chapterId) continue

        const chapNum = Number(chapter.chapterNo) //We're manually setting the chapters regarless, however usually the ID equals the chapter number.


        const date: Date = new Date(chapter.publishDate)

        if (!chapterId || !title) continue

        chapters.push({
            id: chapterId,
            mangaId,
            name: decodeHTMLEntity(title),
            langCode: LanguageCode.THAI,
            chapNum: isNaN(chapNum) ? i : chapNum,
            time: date,
        })

        i--

    }
    return chapters.map(chapter => {
        return createChapter(chapter)
    })
}

export const parseChapterDetails = (data: ChapterImage, mangaId: string, chapterId: string): ChapterDetails => {
    const pages: string[] = []
    for (const images of data.pageItem) {
        let imageFile: string = (images.pageName) ? `${images.pageName}` : `${images.fileName}`
        let image: string | undefined = `https://www.osemocphoto.com/collectManga/${mangaId}/${chapterId}/${imageFile}`
        if (image) pages.push(image)
    }

    const chapterDetails = createChapterDetails({
        id: chapterId,
        mangaId,
        pages: pages,
        longStrip: false,
    })
    return chapterDetails
}


export interface UpdatedManga {
    ids: string[],
    loadMore: boolean;
}

export const parseUpdatedManga = (data: HomeData, time: Date, ids: string[]): UpdatedManga => {
    const updatedManga: string[] = []
    let loadMore = true

    for (const manga of data?.listChapter) {
        const id: string = manga.projectId ?? ''
        const date = manga.createDate
        const mangaDate = new Date(date)

        if (!id || !mangaDate) continue
        if (mangaDate > time) {
            if (ids.includes(id)) {
                updatedManga.push(id)
            }
        } else {
            loadMore = false
        }
    }
    return {
        ids: updatedManga,
        loadMore,
    }
}

export const parseHomeSections = (data: HomeData, sectionCallback: (section: HomeSection) => void): void => {
    const latestSection = createHomeSection({ id: 'latest_comic', title: 'Latest Mangas', view_more: true })

    const latestSection_Array: MangaTile[] = []

    for (const manga of data?.listChapter) {
        const id: string = manga.projectId ?? ''
        let imageVersion: string = manga.imageVersion ?? ''
        let image: string = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? 'https://www.nekopost.net/assets/demo/no_image.jpg'

        const title: string = manga.projectName ?? ''
        const subtitle: string = `Ch.${manga.chapterNo} ${manga.chapterName}` ?? ''

        if (!id || !title) continue
        latestSection_Array.push(createMangaTile({
            id: id,
            image: image,
            title: createIconText({ text: decodeHTMLEntity(title) }),
            subtitleText: createIconText({ text: subtitle }),
        }))
    }
    
    latestSection.items = latestSection_Array
    sectionCallback(latestSection)

}

export const parseViewMore = (data: HomeData): MangaTile[] => {
    const comics: MangaTile[] = []
    const collectedIds: string[] = []

    for (const manga of data?.listChapter) {
        const id: string = manga.projectId ?? ''
        let imageVersion: string = manga.imageVersion ?? ''
        let image: string = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? 'https://www.nekopost.net/assets/demo/no_image.jpg'

        const title: string = manga.projectName ?? ''
        const subtitle: string = `Ch.${manga.chapterNo} ${manga.chapterName}` ?? ''

        if (!id || !title) continue

        if (collectedIds.includes(id)) continue
        comics.push(createMangaTile({
            id,
            image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
            title: createIconText({ text: decodeHTMLEntity(title) }),
            subtitleText: createIconText({ text: subtitle }),
        }))
        collectedIds.push(id)

    }
    return comics
}

export const parseSearch = (data: SearchData): MangaTile[] => {
    const mangaItems: MangaTile[] = []
    const collectedIds: string[] = []
    if (data.listProject != null) {
        for (const manga of data.listProject) {
            const id = manga.projectId ?? ''
            let imageVersion: string = manga.imageVersion ?? ''
            let image: string = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? 'https://www.nekopost.net/assets/demo/no_image.jpg'
            const title: string = manga.projectName ?? ''
    
            const subtitle: string = `Ch.${manga.noChapter}` ?? ''
            if (!id || !title || !image) continue
    
            if (collectedIds.includes(id)) continue
            mangaItems.push(createMangaTile({
                id,
                image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
                title: createIconText({ text: title }),
                subtitleText: createIconText({ text: subtitle }),
            }))
            collectedIds.push(id)
    
        }
    }
    return mangaItems
}

const decodeHTMLEntity = (str: string): string => {
    return entities.decodeHTML(str)
}


