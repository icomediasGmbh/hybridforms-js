export interface ACL {
    id: number;
    title: string;
    upn: string;
    email: null | string;
    isGroup: boolean;
}

export interface Area {
    id: number;
    clientId: number;
    title: string;
    modified: string;
    modifiedBy: string;
}

export interface Info {
    version: string;
    date: string;
    minAppVersion: string;
    minServerVersion: string;
    conditionsOnRender: boolean;
}

export interface ServerFile {
    filename: string;
    size: number;
    contentType: string;
    modified: string;
    version: number;
    fileID: number;
    isReachoutExcluded: boolean;
}

export interface StageDefinition {
    stages: Record<string, Stage>;
}

export interface StageNextItem {
    workflows: string[];
    stage?: string;
    buttonLabel?: string;
    dialogTitle?: string;
    dialogMessage?: string;
}

export interface Stage {
    key: string;
    label: string;
    first: boolean;
    next: StageNextItem;
    appKioskMode: boolean;
    stateChanges: Record<
        string,
        {
            workflows: string[];
        }
    >;
    expiry: any[];
}

export interface FormDefinitionResponse {
    id: number;
    formID: string;
    version: number;
    title: string;
    description: string;
    culture: string;
    archiveDays: null;
    approvedSyncDays: number;
    deleteDays: number;
    deleteEditDays: null;
    deleteGroupDays: null;
    purgeDeletedDays: number;
    files: ServerFile[];
    flags: Record<string, boolean>;
    created: string;
    createdBy: string;
    modified: string;
    modifiedBy: string;
    areaId: number;
    useACL: ACL[];
    editACL: ACL[];
    adminACL: ACL[];
    readonlyACL: ACL[];
    role: string;
    isExtendedReader: boolean;
    area: Area;
    subtitle: string;
    info: Info;
    isReachout: boolean;
    reachoutUrl: string;
    mayUse: boolean;
    stageDefinition: StageDefinition;
}

export interface GroupResponse {
    id: number;
    title: string;
    upn: string;
    email: string;
    isGroup: boolean;
    address: string;
    company: string;
    logoUrl: string;
}

// Structure
/**
 * HybridForms Expandable Tab
 */

enum ExpandableDefaultEnum {
    expanded = 'expanded',
    closed = 'closed'
}

enum NextPageConditionEnum {
    Fullfilled = 'fullfilled',
    Visible = 'visible'
}

enum RepeatingOrderEnum {
    Asc = 'asc',
    Desc = 'desc'
}

/**
 *  HybridForms Conditions - Interfaces
 */
type ConditionExpressionOp = 'and' | 'or';
type ConditionExpressionType =
    | 'page'
    | 'tab'
    | 'block'
    | 'field'
    | 'kiosk'
    | 'stage'
    | 'callback'
    | 'reachout'
    | 'pdf'
    | 'forWeb'
    | 'cordova'
    | 'electron';
type ConditionExpressionElse =
    | 'invisible'
    | 'disabled'
    | 'readonly'
    | 'optional';
type ConditionExpressionVal = boolean | number | string;
type ConditionExpressionValOp =
    | 'equals'
    | 'contains'
    | 'doesnotcontain'
    | 'startswith'
    | 'doesnotstartwith'
    | 'endswith'
    | 'doesnotendwith'
    | 'not'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'regexp';

interface IConditionExpressionElseComplex {
    readonly: IElseCondition;
    disabled: IElseCondition;
    invisible: IElseCondition;
    optional: IElseCondition;
}

interface IConditionExpression {
    type: ConditionExpressionType;
    id: string;
    val?: ConditionExpressionVal;
    op?: ConditionExpressionValOp;
    regexpOp: string;
    nestedOp?: ConditionExpressionOp;
    cond?: IConditionExpression[];
    fullfillMissingField?: boolean;
}

interface IElseCondition {
    cond?: IConditionExpression[];
    default?: boolean;
    op?: ConditionExpressionOp;
}

interface ICondition {
    id: string;
    cond: IConditionExpression[];
    op?: ConditionExpressionOp; // default and
    else?: ConditionExpressionElse | IConditionExpressionElseComplex;
    elseCallback?: string;
    excludeFromValidation?: boolean;
    inProgress?: boolean; // needed for circle detection
    hintText?: string;
    hintHtml?: string;
    condstring: string;
}

interface IFeatureCondition extends ICondition {
    addNewMedia?: boolean;
}

interface IControlCondition {
    id: string;
    fields: string[];
    condition: ICondition;
    state?: IState;
    conditionControls?: IControlConditions;
}

type IControlConditions = Record<string, IControlCondition>;

/**
 *  HybridForms Validation
 */
type FieldValidatorType = 'text' | 'number' | 'email' | 'tel' | 'date' | 'time';

interface IFieldValidator {
    type?: FieldValidatorType;
    min?: number | string;
    max?: number | string;
    step?: number;
    minlength?: number;
    maxlength?: number;
    decimals?: number;
    pattern?: string;
    anytext?: boolean;
    allowedValues?: { value: string; text?: string }[];
    custom?: string;
    jsonSchema?: any;
    errorText?: string | Record<string, string>;
    errorHTML?: string | Record<string, string>;
}

/**
 * LabelControl Interfaces
 */
interface IComplexRequiredFields {
    op: string;
    fields: string;
}

type RequiredFields = string | IComplexRequiredFields[];

interface IListOptions {
    dialogHide: boolean;
    dialogText: string;
}

/**
 *  HybridForms IField
 */
interface IField {
    id: string;
    name: string;
    type: string;
    required: boolean;
    fieldset: RequiredFields;
    requiredFieldsOp?: string;
    list: boolean;
    label: string;
    value: string;
    defaultValue: string;
    htmlTag: string;
    options: Record<string, any>;
    format?: string;
    repeatableDefaultId?: string;
    validator: IFieldValidator;
    refBlockCode?: string;
    refTabCode?: string;
    refSectionCode?: string;
    condition?: ICondition;
    conditionControl?: string[];
    customControlClass?: string;
    removeIf?: string[];
    state?: IState;
    listOptions?: IListOptions;
}

/**
 *  HybridForms IBlock
 */
interface IBlock {
    code: string;
    templateId: string;
    fields: IField[];
    repeatable?: boolean;
    repeatingUnitHeader?: boolean;
    repeatingUnitFooter?: boolean;
    repeatablePostfixFieldId?: string;
    repeatableCount?: number;
    condition?: ICondition;
    conditionControls?: IControlConditions;
    id?: string;
    cssClasses?: string;
    rowCssClasses?: string;
    fullWidth?: boolean;
    tabTitle?: boolean;
    captionText?: string;
    subcaptionText?: string;
    separator?: 'top' | 'bottom' | 'none';
    removeIf?: string[];
    state?: IState;
}

/**
 *  HybridForms ITab
 */

interface IRepeatableDataSource {
    mapping: Record<string, DataSourceMappingEntryType>;
    target?: string | string[];
    onChanged?: string;
}

type DataSourceMappingEntryType =
    | DataSourceFieldIdType
    | DataSourceCallbackType;

interface DataSourceCallbackType {
    sourceIds: DataSourceFieldIdType[];
    callback: string;
}

type DataSourceFieldIdType = string | { fieldId: string; shadowField: string };

interface IDynamicPlaceholder {
    phKey: string;
    pipe: string;
}

type DynamicRepeatingUnitTrigger = 'automatic' | 'manual';

interface IDynamicRepeatingUnit {
    source: any;
    trigger: DynamicRepeatingUnitTrigger;
    onFinished: string;
    filter: string;
}

interface ITab {
    id: string;
    code: string;
    label: string;
    htmlLabel?: string;
    hideLabelPDF?: boolean;
    expandable: boolean;
    expandableId: string;
    expandableDefault?: ExpandableDefaultEnum;
    blocks: IBlock[];
    blockTemplates: IBlock[];
    repeatable: boolean;
    repeatableDynamic: IDynamicRepeatingUnit;
    repeatableMin: number;
    repeatableMax: number;
    repeatableToolbar: boolean;
    repeatableShowOnlyLastToolbar: boolean;
    repeatableLabel: string;
    repeatableLabelAdd: string;
    repeatableLabelRemove: string;
    repeatableAnchors: boolean;
    repeatableAlwaysShowHeaderFooter: boolean;
    repeatableOrder: RepeatingOrderEnum;
    repeatingUnitHeader?: string[];
    repeatingUnitFooter?: string[];
    repeatableDataSource?: IRepeatableDataSource;
    repeatableDynamicPlaceholders?: IDynamicPlaceholder[];
    tabTitleBlock?: IBlock;
    condition?: ICondition;
    cssClasses?: string;
    tooltip?: string;
    removeIf?: string[];
    state?: IState;
}

/**
 *  HybridForms ISection
 */
enum SectionTypeEnum {
    evaluation = 'evaluation'
}

type CondStateType =
    | 'fullfilled'
    | 'else-invisible'
    | 'else-disabled'
    | 'else-readonly'
    | 'else-optional';
interface IState {
    condState: CondStateType;
    filled: number;
    invalid: boolean;
    warning: boolean;
    previousCondState?: CondStateType;
    uiStateId?: string;
    stateId?: string;
    previousStateId?: string;
    rendered?: boolean;
    active?: boolean;
    condElse?: ConditionExpressionElse;
}

interface INextPageButton {
    show?: boolean;
    nextText?: string;
    condition?: NextPageConditionEnum;
    hint?: string;
    audioFeedback?: boolean;
}

interface ISection {
    code: string;
    label: string;
    labelHTML: string;
    tabs: ITab[];
    hideLabelPDF?: boolean;
    type?: SectionTypeEnum;
    condition?: ICondition;
    id?: string;
    cssClasses?: string;
    state?: IState;
    removeIf?: string[];
    nextPageButton?: INextPageButton;
    removePageBreakPDF?: boolean;
}

/**
 *  HybridForms FormDataSource
 */
interface IFormDataSource {
    url: string;
    isOnline?: boolean;
    id: string;
    name: string;
    catalogName: string;
    progressItems?: number;
    formdefinitions?: any[];
}

/**
 *  HybridForms IAppKioskMode
 */
type AppKioskModeType = 'single' | 'sequential';

interface IAppKioskMode {
    mode: AppKioskModeType;
    unlockCode: string;
    lockTime: number;
    approveLabel?: string;
    activateFeatures: boolean;
    showPinOnLock: boolean;
    lockLabel?: string;
    unlockLabel?: string;
}

/**
 * HybridForms FormDefinitionInfo
 */
interface IFormDefinitionInfo {
    version: string;
    date: Date | string;
    minAppVersion?: string;
    minServerVersion?: string;
    conditionsOnRender?: boolean;
}

/**
 * HybridForms SketchTemplate
 */
enum SketchTemplateSourceEnum {
    fromApp = 'fromApp',
    fromFormDef = 'fromFormDef',
    fromPictures = 'fromPictures',
    fromMaps = 'fromMaps',
    fromModel = 'fromModel'
}
interface IHFFeature {
    id: string;
    filename: string;
    fileSize?: number;
    remark?: string;
    date?: string;
    hideInPDF: boolean;
    readonly?: boolean;
    objectLink?: string;
    meta?: IHFFeatureMetadata;
}

interface IHFFeatureMetadata {
    stageId: string;
}

interface IHFPicture extends IHFFeature {
    width: number;
    height: number;
    original: boolean;
    exifOrientation?: number;
    latitude: number; // center
    longitude: number; // center
    accuracy: number;
    accuracyFormatted: string;
    bgFilename: string;
    strokeJson: string;
    sketchTemplate?: boolean;
    sketchLabel?: string;
}

interface IHFMap extends IHFFeature {
    width: number;
    height: number;
    original: boolean;
    latitude: number; // center
    longitude: number; // center
    accuracy: number;
    accuracyFormatted: string;
    zoomLevel: number;
    bounds: any;
    provider: any;
    mapType: any;
    address: any;
    bgFilename: string;
    strokeJson: string;
    sketchTemplate?: boolean;
    sketchLabel?: string;
    serverKeyId?: string;
    connectedMap?: boolean;
    connectedMapId?: string;
    connectedMapJSON?: any;
    hasStaticImage?: boolean;
    directions?: string;
}

interface IHFModel extends IHFFeature {
    fileType: string;
    height: number;
    width: number;
    original: boolean;
    previewFilename?: string;
    connectedModel?: boolean;
    connectedModelId?: string;
    sketchTemplate?: boolean;
    sketchLabel?: string;
    modelData?: any;
}

interface ISketchTemplate {
    label: string;
    id: string;
    image?: string;
    width?: number;
    height?: number;
    thumbnailImage?: string;
    source?: SketchTemplateSourceEnum;
    imageUrl?: string;
    thumbnailImageUrl?: string;
    order?: number;
    featureItem?: IHFPicture | IHFMap | IHFModel;
}

interface ISketchTemplateSettings {
    templates: ISketchTemplate[];
    showDefaultTemplates: boolean;
}

/**
 * HybridForms ApproveButton
 */
interface IApproveButtonSettings {
    label: string;
    dialogMessage?: string;
    dialogTitle?: string;
}

/**
 * HybridForms ListPageFavorite
 */
enum ManipulateCtrlTypeEnum {
    TextField = 'TextField',
    DatePicker = 'DatePicker',
    TimePicker = 'TimePicker',
    CheckBox = 'CheckBox',
    RadioBox = 'RadioBox',
    Switch = 'Switch',
    NumericField = 'NumericField',
    SelectBox = 'SelectBox',
    ComboBox = 'ComboBox',
    DropDownList = 'DropDownList',
    FileUploader = 'FileUploader'
}

enum ManipulateTypeEnum {
    boolean = 'boolean',
    text = 'text',
    email = 'email',
    number = 'number',
    date = 'date',
    time = 'time',
    select = 'select',
    search = 'search',
    radio = 'radio',
    stage = 'stage',
    group = 'group',
    stringArray = 'stringArray'
}

enum SortDirectionEnum {
    Ascending,
    Descending
}

interface IListPageFavorite {
    label: string;
    sorting: {
        id: string;
        type: ManipulateTypeEnum;
        direction?: SortDirectionEnum | string;
        label?: string;
        ctrlType?: ManipulateCtrlTypeEnum;
    };
    grouping: {
        id: string;
        type: ManipulateTypeEnum;
        direction?: SortDirectionEnum | string;
        label?: string;
        ctrlType?: ManipulateCtrlTypeEnum;
    };
    filter: {
        id: string;
        type: ManipulateTypeEnum | string;
        filter: any;
        values?: any[];
        label?: string;
        ctrlType?: ManipulateCtrlTypeEnum;
    };
    default?: boolean;
    formDefault?: boolean;
    type?: IListPageFavoriteType;
    id?: string;
}

type IListPageFavoriteType = 'user' | 'formDefinition';

/**
 * HybridForms ColorPalette
 */

interface IColorPalette {
    color: string;
    text: string;
    default?: boolean;
}

interface IColorPaletteSettings {
    colors: IColorPalette[];
    extendDefaultColors: boolean;
}

interface IReachoutViewSetting {
    show: boolean;
    onStages?: string[];
}

interface IReachoutStrings {
    PDFDownloadButton?: string;
    RemainingTime?: string;
    RemainingTimeIsUp?: string;
    SubmissionError?: string;
    SubmissionSuccessMsg?: string;
    SubmissionSuccessTitle?: string;
    SubmissionSuccessPrimaryBtn?: string;
    SubmissionSuccessHtml?: string;
    PreviewMsgHtml?: string;
    PreviewLoadingMsg?: string;
    ClosePreviewBtn?: string;
    PreviewBtn?: string;
    SendBtn?: string;
    CouldNotGetFormData?: string;
    UploadingFormMsg?: string;
    TransmissionError?: string;
    SaveError?: string;
    NotFilledOut?: string;
    ConfirmSendFormTitle?: string;
    ConfirmSendFormMsg?: string;
    ConfirmSendFormBtnLabel?: string;
}

interface IReachoutSettings {
    maxTime?: number; // in minutes
    minTime?: number; // in minutes
    strings?: IReachoutStrings & Record<string, IReachoutStrings>;
    preview?: IReachoutViewSetting;
    pdfView?: IReachoutViewSetting;
    pdfName?: string;
    pdfNames?: Record<string, string>;
}

interface IPDFSettings {
    hfHideFormTitle?: boolean;
    hfHidePageTitle?: boolean | string[];
    hfHideTabTitle?: boolean | string[];
    hfRemovePageBreak?: boolean | string[];
}

enum CompressionFormatEnum {
    png = 'png',
    jpg = 'jpg',
    original = 'original'
}

enum CompressionTypeEnum {
    original = 'original',
    compress = 'compress'
}

interface IPictureCompression {
    type: CompressionTypeEnum;
    options: {
        maxDimension?: number;
        maxSizeMB?: number;
        format?: CompressionFormatEnum;
        jpgQuality?: number;
    };
}

interface IMediaSettings {
    pictureCompression?: IPictureCompression;
    saveImageToPhotoAlbum?: boolean;
    maxFilenameLength?: number;
    characterWhitelistRegExp?: string;
    invalidCharacterErrorText?: string;
}

interface IPDFEditSettings {
    inkColor: string;
    inkThickness: number;
    inkOpacity: number;
    inkSmoothing: number;
    textColor: string;
    textSize: number;
}

interface IInitializer {
    rendered: string;
    viewRendered: string;
    disposed: string;
}

interface IIconPickerEntry {
    label?: string;
    name: string;
}

interface IIconPicker {
    title: string;
    icons: IIconPickerEntry[];
}

interface ITabMenuSettings {
    fixedDisabled?: boolean | string[];
    scrollable?: boolean | string[];
}

interface IFormSettings {
    formLogo?: string;
    formLogoDark?: string;
    formLogoWidth?: number;
    characterWhitelist?: string;
    characterWhitelistRegExp?: string;
    invalidCharacterErrorText?: string;
}

interface IFormDefinitionFeature {
    condition: IFeatureCondition;
    state: IState;
    disabledByAppFlag?: boolean;
    registeredMaps?: string[];
}

interface IFormDefinitionFeatures {
    pictures: IFormDefinitionFeature;
    sketches: IFormDefinitionFeature;
    maps: IFormDefinitionFeature;
    models: IFormDefinitionFeature;
    audio: IFormDefinitionFeature;
    documents: IFormDefinitionFeature;
}

/**
 * HybridForms FormDefinitionStructure
 */
export interface IFormDefinitionStructure {
    sections: ISection[];
    features: IFormDefinitionFeatures;
    ListDataMapping: Record<string, string>;
    TitleTemplate: string; // deprecated
    templates?: {
        titleTemplate: string;
        listTemplate: string;
        headerTitleTemplate: string;
    };
    legacyTemplate: boolean;
    Title?: string;
    ApproveButton?: IApproveButtonSettings;
    dataSources?: IFormDataSource[];
    approvalCondition?: ICondition;
    version?: number;
    info?: IFormDefinitionInfo;
    appKioskMode?: IAppKioskMode;
    sketchTemplates?: ISketchTemplateSettings;
    listPageFavorites?: IListPageFavorite[];
    drawingColorPalette?: IColorPaletteSettings;
    reachout?: IReachoutSettings;
    pdfSettings?: IPDFSettings;
    pdfEditSettings?: IPDFEditSettings;
    mediaSettings?: IMediaSettings;
    initializer?: IInitializer;
    iconPicker?: IIconPicker[];
    tabMenuSettings?: ITabMenuSettings;
    formSettings?: IFormSettings;
}
