import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import Grid from "@mui/material/Grid2";
import Typography from "@mui/material/Typography";

export const Route = createFileRoute('/sharedIndex/$id/')({
  component: RouteComponent,
})

function RouteComponent() {

  const { cfg } = useRouter().options.context as { cfg: any};
  const { t } = useTranslation();

  return (
     <Grid container spacing={{ xs: 2, md: 3 }} columns={{ xs: 4, sm: 8, md: 12 }}>
      <Grid size={{ xs: 4, sm: 8, md: 12 }}>
        <Typography variant="accordionSummary">
          {t("nav.library.service")}
        </Typography>
      </Grid>
    </Grid>
  );

}
