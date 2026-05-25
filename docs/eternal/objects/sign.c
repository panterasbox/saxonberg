#include "/zone/null/eternal/eternal.h"
inherit ObjectCode;

void extra_create()
{
    set("id",({"sign", "red and yellow sign", "red sign", "yellow sign" }));
      set("short","a red and yellow sign");
      set("long",
	"School is out for the Summer and Fall and Winter!  We regret to inform students of "
	"End of the Line that all classes have been cancelled "
	"until the school can be sprayed for bugs.  We apologize for "
	"any inconvenience.  For now, please use our wide variety of "
	"help topics to familiarize yourself with our happy MUD."
      );
      set("read",
	"School is out for the Summer and Fall and Winter!  We regret to inform students of "
	"End of the Line that classes have all been cancelled " 
	"until the school can be sprayed for bugs.  We apologize for "
	"any inconvenience.  For now, please use our wide variety of "
	"help topics to familiarize yourself with our happy MUD." 
      );  
      set("gettable",0);
  }
