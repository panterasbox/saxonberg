inherit "generator.c";

#include <ansi.h>
#include "map.h"

#define START_ROOM ETERNAL "common"

void create( )
{
    seteuid( getuid( ) );
    set_debug( 0 );
    set_ansi_color( BOLD GREEN );
    set_header_file( ETERNAL_MAP "header" );
    set_legend_file( ETERNAL_MAP "legend" );
    set_map_width( 32 );
    set_map_height( 25 );
    set_start_x( 12 );
    set_start_y( 11 );
    set_start_room( START_ROOM );    
    set_cabal( ETERNAL );
    set_storage_directory( STORAGE_DIR );
    set_generic_map_file( GENERIC_MAP_FILE );
}
