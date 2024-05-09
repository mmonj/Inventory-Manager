from attr import frozen


@frozen
class ICmkStoreHtmlData:
    cmk_url: str
    html_src: str
