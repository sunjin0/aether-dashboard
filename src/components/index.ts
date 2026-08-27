/**
 * 这个文件作为组件的目录
 * 目的是统一管理对外输出的组件，方便分类
 */
/**
 * 布局组件
 */
import Footer from './Footer';
import { Question, SelectLang } from './RightContent';
import { AvatarDropdown, AvatarName } from './RightContent/AvatarDropdown';
import ProFormFileUpload from './ProFormFileUpload';
import FileImage from './FileImage';
export type { FileImageProps } from './FileImage';
export type { ProFormFileUploadProps } from './ProFormFileUpload';
export { AvatarDropdown, AvatarName, FileImage, Footer, ProFormFileUpload, Question, SelectLang };
