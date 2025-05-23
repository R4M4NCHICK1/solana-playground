import { FC, useEffect, useState } from "react";
import styled, {
  css,
  ThemeProvider as StyledThemeProvider,
} from "styled-components";

import { FONTS, THEMES } from "../../themes";
import { Font, PgTheme, Theme } from "../../utils/pg/theme";
import { useSetStatic } from "../../hooks/useSetStatic";

export const ThemeProvider: FC = ({ children }) => {
  const [theme, setTheme] = useState<Theme>();
  const [font, setFont] = useState<Font>();

  useSetStatic(setTheme, PgTheme.events.THEME_SET);
  useSetStatic(setFont, PgTheme.events.FONT_SET);

  // Create initial theme
  useEffect(() => {
    PgTheme.create(THEMES, FONTS);
  }, []);

  // Update `theme.font` when theme or font changes
  useEffect(() => {
    if (theme && font) {
      const fontFamily = PgTheme.addFallbackFont(font.family);
      if (theme.font.code.family !== fontFamily) {
        setTheme((t) => {
          return (
            t && {
              ...t,
              font: {
                code: { ...font, family: fontFamily },
                other: t.font.other,
              },
            }
          );
        });
      }
    }
  }, [theme, font]);

  if (!theme || !font) return null;

  return (
    <StyledThemeProvider theme={theme}>
      <Wrapper>{children}</Wrapper>
    </StyledThemeProvider>
  );
};

// Set default theme values
const Wrapper = styled.div`
  ${({ theme }) => css`
    background: ${theme.colors.default.bgPrimary};
    color: ${theme.colors.default.textPrimary};
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.medium};

    & svg {
      transition: color ${theme.default.transition.duration.short}
        ${theme.default.transition.type};
    }

    & ::selection {
      background: ${theme.colors.default.primary +
      theme.default.transparency.medium};
    }
  `}
`;
