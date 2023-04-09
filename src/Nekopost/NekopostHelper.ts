export interface HomeData {
    code: number
    desc: string
    listChapter: [
        {
            noNewChapter: string
            projectId: string
            projectName: string
            info: string
            chapterId: string
            chapterNo: string
            chapterName: string
            createDate: string
            cover: string
            providerName: string
            imageVersion: string
        }
    ]
}
export interface ChapterImage {
    projectId: string;
    chapterId: string;
    chapterNo: string;
    pageItem: [{
        pageName: string;
    }];
}

export interface MangaDetails {
    code: number
    desc: string
    projectInfo: {
        projectId: string
        projectName: string
        aliasName: string
        website: string
        author: string
        authorName: string
        artist: string
        artistName: string
        info: string
        status: string
        flgMature: string
        flgIntense: string
        flgViolent: string
        flgGlue: string
        flgReligion: string
        mainCategory: string
        goingType: string
        projectType: string
        readerGroup: string
        releaseDate: string
        updateDate: string
        views: string
        imageVersion: string
    }
    listCate: [
        {
            cateCode: string
            cateName: string
            cateLink: string
        }
    ]
    listChapter: [
        {
            chapterId: string
            chapterNo: string
            chapterName: string
            status: string
            publishDate: string
            createDate: string
            view: string
            ownerId: string
            providerName: string
        }
    ]
    listProvider: [
        {
            userId: string
            displayName: string
        }
    ]
    listMedia: [
        {
            fileName: string
            title: string
            category: string
        }
    ]
}

export interface ChapterDetailsImages {
    response: {
        pages: {
            list: [
                {
                    img:    string
                }
            ]
        }
    }
}