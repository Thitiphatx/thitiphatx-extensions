import {
    Chapter,
    ChapterDetails,
    Tag,
    HomeSection,
    SourceManga,
    PartialSourceManga,
    TagSection,
    HomeSectionType
} from '@paperback/types'

import {
    MangaDetails,
    HomeData,
    ChapterImage,
    SearchData,
} from './NekopostHelper'

import entities = require('entities')

export const parseMangaDetails = (data: MangaDetails, mangaId: string): SourceManga => {
    let hentai = false
    const manga = data
    const titles: string[] = []

    const id: string = manga.projectInfo.projectId ?? ''
    const projectName: string = manga.projectInfo.projectName ?? ''
    const alias: string = manga.projectInfo.aliasName ?? ''
    let imageVersion: string = manga.projectInfo.imageVersion ?? ''

    let image: string = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? 'https://www.nekopost.net/assets/demo/no_image.jpg'

    const author: string = manga.projectInfo.authorName ?? ''
    const artist: string = manga.projectInfo.artistName ?? ''
    const info: string = manga.projectInfo.info ?? ''

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
    
    const tagSections: TagSection[] = [App.createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => App.createTag(x)) })]

    const rawStatus: string = manga.projectInfo.status ?? ''
    let status = 'Ongoing'
    if (rawStatus == '0') status = 'Completed'
    return App.createSourceManga({
        id: mangaId,
        mangaInfo: App.createMangaInfo({
            titles: titles,
            image: image,
            hentai: hentai,
            status: status,
            author: author,
            artist: artist,
            tags: tagSections,
            desc: info,
        })
    })
}

export const parseChapters = (data: MangaDetails, mangaId: string): Chapter[] => {
    const chapters: Chapter[] = []
    let sortingIndex = 0

    for (const chapter of data.listChapter) {
        sortingIndex++
        const title: string = chapter.chapterName ?? ''
        const chapterId: string = chapter.chapterId ?? ''

        if (!chapterId) continue

        const chapNum = Number(chapter.chapterNo) //We're manually setting the chapters regarless, however usually the ID equals the chapter number.


        const date: Date = new Date(chapter.publishDate)

        if (!chapterId || !title) continue

        chapters.push({
            id: chapterId,
            name: title,
            langCode: 'ᴛʜ',
            chapNum: chapNum,
            time: date,
            sortingIndex,
            volume: 0,
            group: ''
        })
        sortingIndex--

    }
    return chapters.map(chapter => {
        chapter.sortingIndex += chapters.length
        return App.createChapter(chapter)
    })
}

export const parseChapterDetails = (data: ChapterImage, mangaId: string, chapterId: string): ChapterDetails => {
    const pages: string[] = []

    for (const images of data.pageItem) {
        let imageFile: string = (images.pageName) ? `${images.pageName}` : `${images.fileName}`
        let image: string | undefined = `https://www.osemocphoto.com/collectManga/${mangaId}/${chapterId}/${imageFile}`
        if (image) pages.push(image)
    }

    const chapterDetails = App.createChapterDetails({
        id: chapterId,
        mangaId,
        pages: pages,
    })

    return chapterDetails
}

export const parseHomeSections = (data: HomeData, sectionCallback: (section: HomeSection) => void): void => {
    const updateSection = App.createHomeSection({
        id: 'update',
        title: 'Latest Updates Mangas',
        containsMoreItems: true,
        type: HomeSectionType.singleRowNormal
    })

    const updateSection_Array: PartialSourceManga[] = []
    for (const manga of data?.listChapter) {
        const id: string = manga.projectId ?? ''
        let imageVersion: string = manga.imageVersion ?? ''
        let image: string = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? 'https://www.nekopost.net/assets/demo/no_image.jpg'

        const title: string = manga.projectName ?? ''
        const subtitle: string = `Ch.${manga.chapterNo} ${manga.chapterName}` ?? ''

        if (!id || !title) continue
        updateSection_Array.push(App.createPartialSourceManga({
            image: image,
            title: decodeHTMLEntity(title),
            mangaId: id,
            subtitle: decodeHTMLEntity(subtitle)
        }))
    }
    updateSection.items = updateSection_Array
    sectionCallback(updateSection)
}

export const parseViewMore = (data: HomeData): PartialSourceManga[] => {
    const mangas: PartialSourceManga[] = []
    const collectedIds: string[] = []

    for (const manga of data?.listChapter) {
        const id: string = manga.projectId ?? ''
        let imageVersion: string = manga.imageVersion ?? ''
        let image: string = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? 'https://www.nekopost.net/assets/demo/no_image.jpg'

        const title: string = manga.projectName ?? ''
        const subtitle: string = `Ch.${manga.chapterNo} ${manga.chapterName}` ?? ''

        if (!id || !title) continue

        if (collectedIds.includes(id)) continue
        mangas.push(App.createPartialSourceManga({
            image: image,
            title: decodeHTMLEntity(title),
            mangaId: id,
            subtitle: decodeHTMLEntity(subtitle)
        }))
        collectedIds.push(id)

    }
    return mangas
}

export const parseSearch = (data: SearchData): PartialSourceManga[] => {
    const mangas: PartialSourceManga[] = []

    if (data.listProject != null) {
        for (const manga of data.listProject) {
            const id = manga.projectId ?? ''
            let imageVersion: string = manga.imageVersion ?? ''
            let image: string = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}` ?? 'https://www.nekopost.net/assets/demo/no_image.jpg'
            const title: string = manga.projectName ?? ''
    
            const subtitle: string = `Ch.${manga.noChapter}` ?? ''
            if (!id || !title || !image) continue
    
            mangas.push(App.createPartialSourceManga({
                image: image ? image : 'https://i.imgur.com/GYUxEX8.png',
                title: decodeHTMLEntity(title),
                mangaId: id,
                subtitle: decodeHTMLEntity(subtitle),
            }))
    
        }
    }
    return mangas
}

const decodeHTMLEntity = (str: string): string => {
    return entities.decodeHTML(str)
}