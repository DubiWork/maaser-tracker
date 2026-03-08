import { useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  Link,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TranslateIcon from '@mui/icons-material/Translate';
import { useLanguage } from '../contexts/useLanguage';

const SECTION_ORDER = [
  'introduction',
  'dataWeCollect',
  'howWeStore',
  'howWeUse',
  'yourRights',
  'dataSecurity',
  'children',
  'changes',
  'contact',
];

export default function PrivacyPolicy() {
  const { t, direction, toggleLanguage, language } = useLanguage();
  const policy = t.privacyPolicy;

  const handleBack = useCallback(() => {
    window.location.hash = '';
  }, []);

  const BackArrow = direction === 'rtl' ? ArrowForwardIcon : ArrowBackIcon;

  return (
    <Box
      dir={direction}
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: { xs: 2, sm: 4 },
        px: { xs: 1, sm: 0 },
      }}
    >
      <Container maxWidth="md">
        {/* Navigation bar */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Button
            startIcon={<BackArrow />}
            onClick={handleBack}
            variant="text"
            color="primary"
            aria-label={language === 'he' ? 'חזרה לאפליקציה' : 'Back to app'}
          >
            {language === 'he' ? 'חזרה' : 'Back'}
          </Button>
          <Button
            startIcon={<TranslateIcon />}
            onClick={toggleLanguage}
            variant="outlined"
            size="small"
          >
            {language === 'he' ? 'English' : 'עברית'}
          </Button>
        </Box>

        {/* Main content */}
        <Paper
          elevation={1}
          sx={{
            p: { xs: 2.5, sm: 4 },
            borderRadius: 2,
          }}
        >
          {/* Title */}
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 600 }}
          >
            {policy.title}
          </Typography>

          {/* Last updated */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            {policy.lastUpdated}
          </Typography>

          <Divider sx={{ mb: 3 }} />

          {/* Sections */}
          {SECTION_ORDER.map((sectionKey, index) => {
            const section = policy.sections[sectionKey];
            if (!section) return null;

            return (
              <Box key={sectionKey} sx={{ mb: index < SECTION_ORDER.length - 1 ? 4 : 0 }}>
                <Typography
                  variant="h6"
                  component="h2"
                  gutterBottom
                  sx={{ fontWeight: 500 }}
                >
                  {section.title}
                </Typography>

                <Typography
                  variant="body1"
                  color="text.primary"
                  sx={{ mb: section.items || section.noCollection || section.implementation || section.link ? 1.5 : 0 }}
                >
                  {section.content}
                </Typography>

                {/* List items (for sections with items arrays) */}
                {section.items && (
                  <List dense disablePadding sx={{ mb: section.noCollection || section.implementation ? 1.5 : 0 }}>
                    {section.items.map((item, itemIndex) => (
                      <ListItem
                        key={itemIndex}
                        sx={{
                          py: 0.5,
                          pl: direction === 'rtl' ? 0 : 3,
                          pr: direction === 'rtl' ? 3 : 0,
                        }}
                      >
                        <ListItemText
                          primary={item}
                          primaryTypographyProps={{
                            variant: 'body2',
                            color: 'text.secondary',
                          }}
                          sx={{
                            '&::before': {
                              content: '"\\2022"',
                              position: 'absolute',
                              [direction === 'rtl' ? 'right' : 'left']: 8,
                              color: 'text.secondary',
                            },
                            position: 'relative',
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}

                {/* No collection notice (dataWeCollect section) */}
                {section.noCollection && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontStyle: 'italic' }}
                  >
                    {section.noCollection}
                  </Typography>
                )}

                {/* Implementation note (yourRights section) */}
                {section.implementation && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontStyle: 'italic', mt: 1 }}
                  >
                    {section.implementation}
                  </Typography>
                )}

                {/* Contact link (contact section) */}
                {section.link && (
                  <Link
                    href={section.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'inline-block', mt: 1 }}
                  >
                    {section.link}
                  </Link>
                )}
              </Box>
            );
          })}
        </Paper>

        {/* Bottom back button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
          <Button
            startIcon={<BackArrow />}
            onClick={handleBack}
            variant="contained"
            color="primary"
          >
            {language === 'he' ? 'חזרה לאפליקציה' : 'Back to App'}
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
