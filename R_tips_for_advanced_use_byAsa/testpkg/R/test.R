#' Plot a doughnut chart
#'
#' @param tab two columns: first is type, second is number
#' @param reorder reorder by number?
#' @param mode plot style, 1~3
#' @param topN plot how many top items
#' @param name label the name
#' @param percentage label the percentage
#' @param text_params parameters parse to \code{\link[ggplot2]{geom_text}}
#' @param text_params2 parameters parse to \code{\link[ggplot2]{geom_text}}, for name=T & mode=1,3
#' @param bar_params parameters parse to \code{\link[ggplot2]{geom_rect}}, for mode=1,3 or \code{\link[ggplot2]{geom_col}} for mode=2.
#' @import ggplot2 dplyr
#' @importFrom pcutils update_param
#' @return a ggplot
#' @export
#'
#' @examples
#' library(pcutils)
#' a <- data.frame(type = letters[1:6], num = c(1, 3, 3, 4, 5, 10))
#' gghuan(a) + ggplot2::scale_fill_manual(values = get_cols(6, "col3"))
#' gghuan(a,bar_params=list(col="black"),
#'     text_params=list(col="#b15928",size=3),
#'     text_params2=list(col="#006d2c",size=5))+
#'   ggplot2::scale_fill_manual(values = get_cols(6, "col3"))
#' gghuan(a,mode=2) + ggplot2::scale_fill_manual(values = get_cols(6, "col3"))
#' gghuan(a,mode=3) + ggplot2::scale_fill_manual(values = get_cols(6, "col3"))
gghuan <- function(tab, reorder = TRUE, mode = "1", topN = 5, name = TRUE, percentage = TRUE,
                   bar_params=NULL,text_params=NULL,text_params2=NULL) {
  type=ymax=ymin=rate_per=fraction=NULL
  if (ncol(tab) > 2) stop("need two columns: first is type, second is number")

  colnames(tab)[1] -> g_name
  colnames(tab) <- c("type", "n")

  plot_df <- tab %>%
    dplyr::group_by(type) %>%
    dplyr::summarise(sum = sum(n))

  if (reorder) {
    plot_df$type <- stats::reorder(plot_df$type, plot_df$sum)
    plot_df <- dplyr::arrange(plot_df, -sum)
  }

  if (nrow(plot_df) > topN) {
    plot_df <- rbind(
      head(plot_df, topN),
      data.frame(
        type = "others",
        sum = sum(plot_df$sum[(topN + 1):nrow(plot_df)])
      )
    )

    plot_df$type <- stats::relevel(factor(plot_df$type), "others")
  }
  dplyr::mutate(plot_df, fraction = sum / sum(sum)) -> plot_df

  plot_df$ymax <- cumsum(plot_df$fraction)
  plot_df$ymin <- c(0, head(plot_df$ymax, n = -1))
  if (percentage) {
    plot_df$rate_per <- paste(as.character(round(100 * plot_df$fraction, 1)), "%", sep = "")
  } else {
    plot_df$rate_per <- plot_df$sum
  }

  if (mode == "1") {
    plt <- ggplot(data = plot_df, aes(fill = type, ymax = ymax, ymin = ymin, xmax = 3.2, xmin = 1.7)) +
      do.call(geom_rect,update_param(list(alpha = 0.8),bar_params))+
      xlim(c(0, 5)) +
      coord_polar(theta = "y") +
      do.call(geom_text,update_param(list(mapping = aes(x = 2.5, y = ((ymin + ymax) / 2), label = rate_per), size = 3.6, col = "white"),text_params))

    if (name) plt <- plt +do.call(geom_text,update_param(list(mapping = aes(x = 3.6, y = ((ymin + ymax) / 2), label = type), size = 4),text_params2))

  }
  if (mode == "2") {
    plt <- ggplot(plot_df, aes(x = type, y = fraction, fill = type)) +
      do.call(geom_col,update_param(list(position = "dodge2", show.legend = TRUE, alpha = .9),bar_params))+
      coord_polar(theta = "x") +
      ylim(-min(plot_df$fraction), max(plot_df$fraction)) +
      do.call(geom_text,update_param(list(mapping = aes(x = type, y = fraction,
                                                        label = paste0(type, ": ", rate_per)), size = 4),text_params))

  }
  if (mode == 3) {
    # lib_ps("ggpubr", library = FALSE)
    # labs <- paste0(plot_df$type, "\n", plot_df$rate_per)
    # p <- ggpubr::ggpie(plot_df, "fraction", label = labs, fill = "type") + theme(legend.position = "none")
    plt <- ggplot(data = plot_df, aes(fill = type, ymax = ymax, ymin = ymin, xmax = 3.2, xmin = 1.7)) +
      do.call(geom_rect,update_param(list(alpha = 0.8),bar_params))+
      xlim(c(1.7, 3.5)) +
      coord_polar(theta = "y") +
      do.call(geom_text,update_param(list(mapping = aes(x = 2.8, y = ((ymin + ymax) / 2), label = rate_per), size = 3.6, col = "white"),text_params))

    if (name) plt <- plt +do.call(geom_text,update_param(list(mapping = aes(x = 3.4, y = ((ymin + ymax) / 2), label = type), size = 4),text_params2))
  }

  plt <- plt + theme_light() +
    labs(x = "", y = "", fill = g_name) +
    theme(panel.grid = element_blank()) +
    theme(axis.text = element_blank()) +
    theme(axis.ticks = element_blank()) +
    theme(panel.border = element_blank(), legend.position = "none")
  return(plt)
}

a=function(){}
