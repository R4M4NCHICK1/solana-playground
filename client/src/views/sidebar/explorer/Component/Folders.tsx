import {
  ComponentPropsWithoutRef,
  CSSProperties,
  FC,
  forwardRef,
  MouseEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import styled, { css, useTheme } from "styled-components";

import ExplorerButtons from "./ExplorerButtons";
import Button, { ButtonProps } from "../../../../components/Button";
import DndContext, { DragEndEvent } from "../../../../components/Dnd/Context";
import Droppable from "../../../../components/Dnd/Droppable";
import Draggable from "../../../../components/Dnd/Draggable";
import LangIcon from "../../../../components/LangIcon";
import { ExplorerContextMenu } from "./ExplorerContextMenu";
import {
  Arrow,
  Plus,
  TestTube,
  Triangle,
  Wrench,
} from "../../../../components/Icons";
import { ClassName, Id } from "../../../../constants";
import { PgCommon, PgExplorer } from "../../../../utils/pg";
import { useExplorerContextMenu } from "./useExplorerContextMenu";
import { useNewItem } from "./useNewItem";
import { useKeybind } from "../../../../hooks";

const Folders = () => {
  const theme = useTheme();

  // Handle folder state
  useEffect(() => {
    const switchWorkspace = PgExplorer.onDidSwitchWorkspace(() => {
      // Reset folder open/closed state
      PgExplorer.collapseAllFolders();
    });

    const openParentsAndSelectEl = (path: string) => {
      // Open if current file's parents are not opened
      PgExplorer.openAllParents(path);

      // Change selected element
      const newEl = PgExplorer.getElFromPath(path);
      if (newEl) {
        PgExplorer.setSelectedEl(newEl);
        PgExplorer.removeCtxSelectedEl();
      }
    };

    const switchFile = PgExplorer.onDidOpenFile(async (file) => {
      if (!file) return;

      openParentsAndSelectEl(file.path);

      // Sleep before opening parents because switching workspace collapses
      // all folders after file switching
      await PgCommon.sleep(300);
      openParentsAndSelectEl(file.path);
    });

    return () => {
      switchWorkspace.dispose();
      switchFile.dispose();
    };

    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.name]);

  const ctxMenu = useExplorerContextMenu();
  const { newItem } = useNewItem();

  useKeybind(
    [
      { keybind: "Alt+N", handle: newItem },
      { keybind: "F2", handle: ctxMenu.renameItem },
      { keybind: "Delete", handle: ctxMenu.deleteItem },
    ],
    []
  );

  // Move
  const handleDragEnd = useCallback(async (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over) return;

    const fromPath = active.id as string;
    const toPath = over.id as string;
    if (PgCommon.isPathsEqual(fromPath, toPath)) return;

    const isToPathFolder = PgExplorer.getItemTypeFromPath(toPath).folder;
    if (!isToPathFolder) return;

    const itemName = PgExplorer.getItemNameFromPath(fromPath);
    const newPath = PgExplorer.getCanonicalPath(
      PgCommon.joinPaths([toPath, itemName])
    );
    if (PgCommon.isPathsEqual(fromPath, newPath)) return;

    await PgExplorer.renameItem(fromPath, newPath, {
      skipNameValidation: true,
    });
  }, []);

  // No need to memoize here
  const relativeRootPath = PgExplorer.getProjectRootPath();
  const { folders } = PgExplorer.getFolderContent(relativeRootPath);
  const otherFolders = folders.filter(
    (f) =>
      f !== PgExplorer.PATHS.SRC_DIRNAME &&
      f !== PgExplorer.PATHS.CLIENT_DIRNAME &&
      f !== PgExplorer.PATHS.TESTS_DIRNAME
  );

  return (
    <>
      <ExplorerButtons />

      <DndContext onDragEnd={handleDragEnd}>
        <ExplorerContextMenu {...ctxMenu}>
          <RootWrapper id={Id.ROOT_DIR} data-path={relativeRootPath}>
            {/* Program */}
            <SectionTopWrapper>
              <SectionHeader>Program</SectionHeader>
              {folders.includes(PgExplorer.PATHS.SRC_DIRNAME) ? (
                <SectionButton
                  onClick={ctxMenu.runBuild}
                  Icon={<Wrench />}
                  addTextMargin
                >
                  Build
                </SectionButton>
              ) : (
                <SectionButton onClick={ctxMenu.addProgram} Icon={<Plus />}>
                  Add
                </SectionButton>
              )}
            </SectionTopWrapper>
            <FolderGroup
              folders={folders.filter(
                (f) => f === PgExplorer.PATHS.SRC_DIRNAME
              )}
              relativeRootPath={relativeRootPath}
            />

            {/* Client and tests */}
            <SectionTopWrapper>
              <SectionHeader>Client</SectionHeader>
              {folders.includes(PgExplorer.PATHS.CLIENT_DIRNAME) ? (
                <SectionButton
                  onClick={ctxMenu.runClientFolder}
                  Icon={<Triangle rotate="90deg" />}
                  title="Run All (in client dir)"
                >
                  Run
                </SectionButton>
              ) : (
                <SectionButton onClick={ctxMenu.addClient} Icon={<Plus />}>
                  Add client
                </SectionButton>
              )}

              {folders.includes(PgExplorer.PATHS.TESTS_DIRNAME) ? (
                <SectionButton
                  onClick={ctxMenu.runTestFolder}
                  Icon={<TestTube />}
                  title="Test All (in tests dir)"
                >
                  Test
                </SectionButton>
              ) : (
                <SectionButton onClick={ctxMenu.addTests} Icon={<Plus />}>
                  Add tests
                </SectionButton>
              )}
            </SectionTopWrapper>
            <FolderGroup
              folders={folders.filter(
                (f) =>
                  f === PgExplorer.PATHS.CLIENT_DIRNAME ||
                  f === PgExplorer.PATHS.TESTS_DIRNAME
              )}
              relativeRootPath={relativeRootPath}
            />

            {/* Other */}
            {otherFolders.length > 0 && (
              <SectionTopWrapper>
                <SectionHeader>Other</SectionHeader>
              </SectionTopWrapper>
            )}
            <FolderGroup
              folders={otherFolders}
              relativeRootPath={relativeRootPath}
            />
          </RootWrapper>
        </ExplorerContextMenu>
      </DndContext>
    </>
  );
};

interface SectionButtonProps extends ButtonProps {
  Icon: ReactNode;
  addTextMargin?: boolean;
}

const SectionButton: FC<SectionButtonProps> = ({
  onClick,
  Icon,
  addTextMargin,
  children,
  ...props
}) => (
  <Button onClick={onClick} kind="icon" {...props}>
    {Icon}
    <SectionButtonText addTextMargin={addTextMargin}>
      {children}
    </SectionButtonText>
  </Button>
);

const SectionButtonText = styled.span<
  Pick<SectionButtonProps, "addTextMargin">
>`
  ${({ addTextMargin }) => css`
    margin: 0 0.25rem;
    ${addTextMargin && "margin-left: 0.50rem"};
  `}
`;

interface FolderGroupProps {
  folders: string[];
  relativeRootPath: string;
}

const FolderGroup: FC<FolderGroupProps> = ({ folders, relativeRootPath }) => (
  <>
    {folders
      .sort((a, b) => a.localeCompare(b))
      .map((foldername) => (
        <RecursiveFolder
          key={foldername}
          path={PgCommon.appendSlash(
            PgCommon.joinPaths([relativeRootPath, foldername])
          )}
        />
      ))}
  </>
);

interface RecursiveFolderProps {
  path: string;
}

const RecursiveFolder: FC<RecursiveFolderProps> = ({ path }) => {
  const folderName = useMemo(
    () => PgExplorer.getItemNameFromPath(path),
    [path]
  );

  const depth = useMemo(
    () => PgExplorer.getRelativePath(path).split("/").length - 2,
    [path]
  );

  // Intentionally don't memoize in order to re-render
  const { files, folders } = PgExplorer.getFolderContent(path);

  const toggle = useCallback((ev: MouseEvent<HTMLDivElement>) => {
    const el = ev.currentTarget;
    // Set selected
    PgExplorer.setSelectedEl(el);
    PgExplorer.setCtxSelectedEl(el);

    if (PgExplorer.getItemTypeFromEl(el)?.folder) {
      PgExplorer.toggleFolder(el);
    } else {
      PgExplorer.openFile(PgExplorer.getItemPathFromEl(el)!);
    }
  }, []);

  const theme = useTheme();
  const overStyle: CSSProperties = useMemo(
    () => ({
      background: theme.colors.default.primary + theme.default.transparency.low,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme.name]
  );

  return (
    <Droppable id={path} overStyle={overStyle}>
      <Draggable
        id={path}
        Item={StyledFolder}
        itemProps={{
          path,
          name: folderName,
          depth,
          onClick: toggle,
          className: ClassName.FOLDER,
        }}
      />

      <FolderInsideWrapper
        className={`${ClassName.FOLDER_INSIDE} ${ClassName.HIDDEN}`}
      >
        {folders
          .sort((a, b) => a.localeCompare(b))
          .map((folderName) => (
            <RecursiveFolder
              key={folderName}
              path={PgCommon.appendSlash(
                PgCommon.joinPaths([path, folderName])
              )}
            />
          ))}

        {files
          .sort((a, b) => a.localeCompare(b))
          .map((fileName) => (
            <Draggable
              key={fileName}
              id={PgCommon.joinPaths([path, fileName])}
              Item={StyledFile}
              itemProps={{
                path: PgCommon.joinPaths([path, fileName]),
                name: fileName,
                depth: depth + 1,
                onClick: toggle,
                className: ClassName.FILE,
              }}
            />
          ))}
      </FolderInsideWrapper>
    </Droppable>
  );
};

interface FileOrFolderProps {
  path: string;
  name: string;
  depth: number;
}

type FolderProps = FileOrFolderProps & ComponentPropsWithoutRef<"div">;

const Folder = forwardRef<HTMLDivElement, FolderProps>(
  ({ path, name, depth, ...props }, ref) => (
    <div ref={ref} data-path={path} {...props}>
      <PaddingLeft depth={depth} />
      <Arrow />
      <span>{name}</span>
    </div>
  )
);

type FileProps = FileOrFolderProps & ComponentPropsWithoutRef<"div">;

const File = forwardRef<HTMLDivElement, FileProps>(
  ({ path, name, depth, ...props }, ref) => (
    <div ref={ref} data-path={path} {...props}>
      <PaddingLeft depth={depth} />
      <LangIcon fileName={name} />
      <span>{name}</span>
    </div>
  )
);

const RootWrapper = styled.div`
  ${({ theme }) => css`
  & .${ClassName.FOLDER}, & .${ClassName.FILE} {
    display: flex;
    align-items: center;
    padding: 0.25rem 1rem;
    cursor: pointer;
    border: 1px solid transparent;
    font-size: ${theme.font.code.size.small};

    &.${ClassName.SELECTED} {
      background: ${
        theme.colors.default.primary + theme.default.transparency.low
      };
    }

    &.${ClassName.CTX_SELECTED} {
      background: ${
        theme.colors.default.primary + theme.default.transparency.low
      };
      border-color: ${
        theme.colors.default.primary + theme.default.transparency.medium
      };
      border-radius: ${theme.default.borderRadius};
    }

    &:hover {
      background: ${
        theme.colors.default.primary + theme.default.transparency.low
      };
    }
`}
`;

const SectionTopWrapper = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    margin-left: 1rem;
    margin-bottom: 0.25rem;
    color: ${theme.colors.default.textSecondary};

    &:not(:first-child) {
      margin-top: 1rem;
    }

    & > button {
      margin-left: 0.5rem;
    }

    & > button:nth-child(2) {
      margin-left: 0.75rem;
    }
  `}
`;

const SectionHeader = styled.div`
  font-size: ${({ theme }) => theme.font.code.size.large};
`;

const FolderInsideWrapper = styled.div`
  &.${ClassName.HIDDEN} {
    display: none;
  }
`;

const StyledFolder = styled(Folder)`
  ${({ theme }) => css`
    & span {
      color: ${theme.colors.default.primary};
      margin-left: 0.5rem;
    }

    & svg {
      width: 0.875rem;
      height: 0.875rem;
      transition: transform ${theme.default.transition.duration.short}
        ${theme.default.transition.type};
    }

    &.${ClassName.OPEN} svg {
      transform: rotate(90deg);
    }
  `}
`;

const StyledFile = styled(File)`
  & img {
    margin-left: 0.125rem;
  }

  & span {
    color: ${({ theme }) => theme.colors.default.textPrimary};
    margin-left: 0.375rem;
  }
`;

const PaddingLeft = styled.div<{ depth: number }>`
  width: ${({ depth }) => depth}rem;
  height: 100%;
`;

export default Folders;
