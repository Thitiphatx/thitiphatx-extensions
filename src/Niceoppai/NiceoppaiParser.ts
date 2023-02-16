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

import entities = require('entities')

export const parseMangaDetails = ($: CheerioStatic, mangaId: string): Manga => {

    const titles: string[] = []
    titles.push(decodeHTMLEntity($('div.wpm_pag.mng_det > h1').first().text().trim()))

    let image: string = $('img', 'div.cvr_ara').attr('src') ?? 'https://i.imgur.com/GYUxEX8.png'
    if (image.startsWith('/')) image = 'https:' + image

    const author: string = $('div.det p:nth-child(7) a').text().trim() ?? ''
    const description: string = decodeHTMLEntity($('div.det > p:nth-child(3)').text().trim() ?? '')

    let hentai = false
    const arrayTags: Tag[] = []
    for (const tag of $('a', 'div.det > p:nth-child(9) a').toArray()) {
        const label: string = $(tag).text().trim()
        const id: string = $(tag).attr('href').split('/')[4] ?? ''

        if (!id || !label) continue
        if (['ADULT', 'SMUT', 'MATURE'].includes(label.toUpperCase())) hentai = true
        arrayTags.push({ id: id, label: label })
    }
    const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })]

    const rawStatus: string = $('div.det > p:nth-child(13)').text().trim().split(' ')[1] ?? ''
    let status = MangaStatus.ONGOING
    if (rawStatus.includes('แล้ว')) status = MangaStatus.COMPLETED

    return createManga({
        id: mangaId,
        titles: titles,
        image: image,
        hentai: hentai,
        status: status,
        author: author,
        artist: author,
        tags: tagSections,
        desc: description,
    })
}

export const parseChapters = ($: CheerioStatic, mangaId: string): Chapter[] => {
    const chapters: Chapter[] = []
    let sortingIndex = 0

    for (const chapter of $('li.lng_', 'div.wpm_pag.mng_det ul.lst').toArray()) {
        i++
        const title: string = $('a > b.val', chapter).text().trim() ?? ''
        const chapterId: string = $('a', chapter).attr('href')?.split('/')[4] ?? ''

        if (!chapterId) continue

        const chapNum = Number(chapterId) //We're manually setting the chapters regarless, however usually the ID equals the chapter number.


        const date: Date = new Date($('a > b.dte', chapter).last().text().trim())

        if (!chapterId || !title) continue

        chapters.push({
            id: chapterId,
            mangaId,
            name: decodeHTMLEntity(title),
            langCode: LanguageCode.THAI,
            chapNum: isNaN(chapNum) ? i : chapNum,
            time: date,
            // @ts-ignore
            sortingIndex
        })

        sortingIndex--

    }
    return chapters.map(chapter => {
        // @ts-ignore
        chapter.sortingIndex += chapters.length
        return createChapter(chapter)
    })
}

export const parseChapterDetails = ($: CheerioStatic, mangaId: string, chapterId: string): ChapterDetails => {
    const pages: string[] = []

    for (const images of $('img', '#image-container > center').toArray()) {
        let image: any = $(images).attr('src')?.trim()
        if (image.startsWith('/')) image = 'https:' + image
        if (image) pages.push(image)
    }

    const chapterDetails = createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages: pages,
        longStrip: false,
    })
    return chapterDetails
}


export interface UpdatedManga {
    ids: string[],
    loadMore: boolean;
}

export const parseUpdatedManga = ($: CheerioStatic, time: Date, ids: string[]): UpdatedManga => {
    const updatedManga: string[] = []
    let loadMore = true

    for (const manga of $('div.row', '#sct_content div.con div.wpm_pag.mng_lts_chp.grp').toArray()) {
        const id = $('div.det a.ttl', manga).attr('href').split('/')[3] ?? ''
        const date = $('ul.lst li:nth-child(1) a b.dte', manga).text().trim() ?? ''
        let mangaDate = new Date()
        if (date.toUpperCase() !== 'วันนี้') {
            mangaDate = new Date(date)
        }

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

export const parseHomeSections = ($: CheerioStatic, sectionCallback: (section: HomeSection) => void): void => {
    const latestSection = createHomeSection({ id: 'latest_comic', title: 'Latest Comics', view_more: true })

    const latestSection_Array: MangaTile[] = []

    for (const comic of $('div.row', 'div.wpm_pag.mng_lts_chp.grp').toArray()) {
        let image: string = $('div.cvr > div > a > img', comic).first().attr('src') ?? ''
        if (image.startsWith('/')) image = 'https:' + image
        const title: string = $('div.det > a', comic).first().text().trim() ?? ''
        const id: string = $('div.det > a', comic).attr('href').split('/')[3] ?? ''
        const subtitle: string = $('b.val.lng_', comic).first().text().trim() ?? ''
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

export const parseViewMore = ($: CheerioStatic): MangaTile[] => {
    const comics: MangaTile[] = []
    const collectedIds: string[] = []

    for (const item of $('div.nde', '#sct_content div.con div.wpm_pag.mng_lst.tbn').toArray()) {
        let image: string = $('div.cvr div.img_wrp a img', item).first().attr('src') ?? ''
        if (image.startsWith('/')) image = 'https:' + image

        const title: string = $('div.det > a.ttl', item).first().text().trim() ?? ''
        const id: string = $('div.det a.ttl', item).attr('href').split('/')[3] ?? ''
        const subtitle: string = $('div.det ul.lst li a.lst b.val.lng_', item).first().text().trim() ?? ''

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

export const parseSearch = ($: CheerioStatic): MangaTile[] => {
    const comics: MangaTile[] = []

        for (const obj of $('div.nde', '#sct_content div.con div.wpm_pag.mng_lst.tbn').toArray()) {
            let image: string = $('div.cvr div.img_wrp a img', obj).first().attr('src') ?? ''

            const title: string = $('div.det a', obj).first().text() ?? ''

            const id = $('a', obj).attr('href').split('/')[3] ?? ''

            const views = $('div.det > div.vws', obj).text().trim()
            
            const subtitle = views ? views + 'views' : 'N/A Views'

            if (!id || !title) continue
            comics.push(createMangaTile({
                id,
                image: image,
                title: createIconText({ text: decodeHTMLEntity(title) }),
                subtitleText: createIconText({ text: decodeHTMLEntity(subtitle) })
            }))
        }

    return comics
}
const decodeHTMLEntity = (str: string): string => {
    return entities.decodeHTML(str)
}

export const isLastPage = ($: CheerioStatic): boolean => {
    let isLast = false
    const pages = []
    for (const page of $('li', 'ul.pgg').toArray()) {
        const p = Number($(page).text().trim())
        if (isNaN(p)) continue
        pages.push(p)
    }
    const lastPage = Math.max(...pages)
    const currentPage = Number($('li > a.sel').text().trim())
    if (currentPage >= lastPage) isLast = true
    return isLast
}
