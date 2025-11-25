import AppCard from "./AppCard";

interface App {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  stats: {
    users: string;
    rating: number;
  };
  featured?: boolean;
}

interface AppGridProps {
  apps: App[];
  title?: string;
}

const AppGrid = ({ apps, title }: AppGridProps) => {
  return (
    <div>
      {title && <h2 className="text-2xl font-bold mb-6">{title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {apps.map((app) => (
          <AppCard key={app.id} {...app} />
        ))}
      </div>
    </div>
  );
};

export default AppGrid;
