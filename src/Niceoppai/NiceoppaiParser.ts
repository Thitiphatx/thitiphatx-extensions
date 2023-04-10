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

    const author: string = $('div.det > p:nth-child(7) > a').text().trim() ?? ''
    const description: string = decodeHTMLEntity($('div.det > p:nth-child(3)').text().trim() ?? '')

    let hentai = false
    const arrayTags: Tag[] = []
    for (const tag of $('a', 'div.det > p:nth-child(9) a').toArray()) {
        const label: string = $(tag).text().trim()
        const id: string = $(tag).attr('href')?.split('/').pop() ?? ''

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
    let i = 0

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
        })

        i--

    }
    return chapters.map(chapter => {
        return createChapter(chapter)
    })
}

export const parseChapterDetails = ($: CheerioStatic, mangaId: string, chapterId: string): ChapterDetails => {
    const pages: string[] = []

    for (const images of $('img', '#image-container > center').toArray()) {
        let image: string | undefined = $(images).attr('src')?.trim()
        if (image && image.startsWith('/')) image = 'https:' + image
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

export const parseUpdatedManga = ($: CheerioStatic, time: Date, ids: string[]): UpdatedManga => {
    const updatedManga: string[] = []
    let loadMore = true

    for (const manga of $('div.row', '#sct_content div.con div.wpm_pag.mng_lts_chp.grp').toArray()) {
        const id: string = $('div.det > a.ttl', manga).attr('href').split('/')[3] ?? ''
        const date = $('a > b.dte', manga).last().text().trim()
        let mangaDate = new Date()
        if (date !== 'วันนี้') {
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
    const latestSection = createHomeSection({ id: 'latest_comic', title: 'Latest Mangas', view_more: true })
    const popularSection = createHomeSection({ id: 'popular_comic', title: 'Popular Mangas', view_more: false })
    
    const popularSection_Array: MangaTile[] = []
    for (const comic of $('div.nde', 'li.wid.widget_text div.con div.textwidget div.wpm_pag.mng_lts_chp.tbn').toArray()) {
        let image: string = $('div.cvr > div > a > img', comic).first().attr('src').replace("62x88","350x0") ?? ''
        if (image.startsWith('/')) image = 'https:' + image
        const title: string = $('div.det div.ifo a.ttl', comic).first().text().trim() ?? ''
        const id: string = $('div.det div.ifo a.ttl', comic).attr('href').split('/')[3] ?? ''

        if (!id || !title) continue
        popularSection_Array.push(createMangaTile({
            id: id,
            image: image,
            title: createIconText({ text: decodeHTMLEntity(title) }),
        }))
    }

    popularSection.items = popularSection_Array
    sectionCallback(popularSection)

    const latestSection_Array: MangaTile[] = []

    for (const comic of $('div.row', 'div.wpm_pag.mng_lts_chp.grp').toArray()) {
        let image: string = $('div.cvr > div > a > img', comic).first().attr('src').replace("36x0","350x0") ?? ''
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

    for (const item of $('div.row', '#sct_content div.con div.wpm_pag.mng_lts_chp.grp').toArray()) {
        let image: string = $('div.cvr div.img_wrp > a > img', item).first().attr('src').replace("36x0","350x0") ?? ''

        const title: string = $('div.det > a.ttl', item).first().text().trim() ?? ''
        const id: string = $('div.det > a.ttl', item).attr('href').split('/')[3] ?? ''
        const subtitle: string = $('div.det ul.lst li a > b.val.lng_', item).first().text().trim() ?? ''

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
    const mangaItems: MangaTile[] = []
    const collectedIds: string[] = []

    for (const manga of $('#sct_content div.con div.wpm_pag.mng_lst.tbn div.nde').toArray()) {
        const id = $('div.det > a', manga).attr('href')?.split('/')[3] ?? ''
        const image: string = $('div.cvr > div.img_wrp > a > img', manga).first().attr('src').replace("36x0","350x0") ?? ''
        const title: string = $('div.det > a', manga).text().trim() ?? ''
        const subtitle: string = $('div.det > div.vws', manga).text().trim() ?? ''
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
    return mangaItems
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